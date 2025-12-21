<?php
/**
 * Helper: Extract plain text and collapse whitespace.
 */
function eventive_plaintext($s) {
    if (!is_string($s) || $s === '') return '';
    $s = wp_strip_all_tags($s);
    $s = html_entity_decode($s, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $s = preg_replace('/\s+/u', ' ', $s);
    return trim($s);
}

/**
 * Helper: Truncate at word boundary.
 */
function eventive_truncate($s, $limit = 180) {
    $s = trim($s);
    if (mb_strlen($s, 'UTF-8') <= $limit) return $s;
    $cut = mb_substr($s, 0, $limit, 'UTF-8');
    // backtrack to last space
    $pos = mb_strrpos($cut, ' ', 0, 'UTF-8');
    if ($pos !== false) $cut = mb_substr($cut, 0, $pos, 'UTF-8');
    return rtrim($cut, "\s\pP") . '…';
}

/**
 * Build an excerpt from Eventive film fields prioritizing logline + key details.
 */
function eventive_build_film_excerpt(array $film, $limit = 180) {
    $name      = eventive_plaintext($film['name'] ?? '');
    $logline   = eventive_plaintext($film['logline'] ?? ($film['short_description'] ?? ''));
    // Some feeds put synopsis only in description
    $desc      = eventive_plaintext($film['description'] ?? '');

    $details   = isset($film['details']) && is_array($film['details']) ? $film['details'] : [];
    $director  = eventive_plaintext($details['director'] ?? ($film['credits']['director'] ?? ''));
    $runtime   = eventive_plaintext($details['runtime'] ?? '');
    $year      = eventive_plaintext($details['year'] ?? '');
    $language  = eventive_plaintext($details['language'] ?? '');

    // Compose a base line: prefer logline > description fallback
    $base = $logline !== '' ? $logline : $desc;

    // Assemble metadata phrase
    $metaParts = [];
    if ($director !== '') $metaParts[] = "Director: $director";
    if ($runtime !== '')  $metaParts[] = "Runtime: $runtime min";
    if ($year !== '')     $metaParts[] = "Year: $year";
    if ($language !== '') $metaParts[] = "Language: $language";
    $meta = !empty($metaParts) ? ' ' . implode(' • ', $metaParts) : '';

    // If base is empty, create a minimal sentence
    if ($base === '') {
        $base = $name !== '' ? "$name — An official selection at Eastern Oregon Film Festival." : 'An official selection at Eastern Oregon Film Festival.';
    }

    $full = trim($base . $meta);
    return eventive_truncate($full, $limit);
}
/**
 * Film Sync Admin Class for Eventive Integration
 * Last Updated: 2025-07-10
 *
 * This file defines the FilmSyncService class and the Eventive_Sync_Films admin UI handler
 * for syncing films from the Eventive API into WordPress pages. The core functionality includes:
 *
 * - Fetching film data from the Eventive API based on configured event bucket and secret key.
 * - Listing all imported films (those with a custom meta field `_eventive_film_id`) as a preview.
 * - Allowing admin users to preview and selectively import (or update) new films as WordPress pages.
 * - Providing pagination for long film lists to manage larger cinema catalogs.
 * - Enabling "Select All" / "Deselect All" and real-time selection tracking with a badge.
 * - Using AJAX-based calls for both previewing films and initiating film syncs.
 * - Auto-refreshing the page on sync completion to reflect updated film status.
 * - Setting custom post meta such as `_eventive_film_id` and `_eventive_loader_override` for each synced page.
 * - Supporting featured image assignment from the Eventive film data.
 * - NEW (2025-07-10):
 *     - Adds setting `eventive_enable_film_sync` to toggle between synced film pages and a single film detail page.
 *     - If disabled, a UI is presented to select or create a film detail page.
 *     - Selected detail page is stored in `eventive_film_detail_page_id` and used to route film links with ?film-id=.
 *
 * This system is designed to streamline the process of importing films from Eventive into WordPress,
 * and to support dynamic, per-page loader.js script inclusion using the bucket meta field.
 */
class FilmSyncService {
    public function __construct() {}
    
    public function get_eventive_api_credentials() {
        $options = get_option('eventive_admin_options_option_name', []);
        $event_bucket = $options['your_eventive_event_bucket_1'] ?? '';
        $api_key = $options['your_eventive_secret_key_2'] ?? '';
        return [$event_bucket, $api_key];
    }

    public function fetch_eventive_films($event_bucket, $api_key) {
        $response = wp_remote_get("https://api.eventive.org/event_buckets/$event_bucket/films", [
            'headers' => ['x-api-key' => $api_key],
        ]);
        if (is_wp_error($response)) {
            return new WP_Error('api_error', 'Error fetching films from Eventive API.');
        }
        $body = wp_remote_retrieve_body($response);
        $films = json_decode($body, true)['films'] ?? [];
        return $films;
    }

    public function get_imported_pages() {
        $existing_film_pages = [];
        $film_query = new WP_Query([
            'post_type'   => ['page', 'post'],
            'post_status' => ['publish', 'draft'],
            'meta_query'  => [
                [
                    'key'     => '_eventive_film_id',
                    'compare' => 'EXISTS',
                ],
            ],
            'posts_per_page' => -1,
        ]);
        foreach ($film_query->posts as $post) {
            $film_id = get_post_meta($post->ID, '_eventive_film_id', true);
            if ($film_id) {
                $existing_film_pages[$film_id] = [
                    'ID' => $post->ID,
                    'title' => get_the_title($post->ID),
                    'status' => get_post_status($post->ID),
                    'url' => get_permalink($post->ID),
                ];
            }
        }
        return $existing_film_pages;
    }

    public function get_unsynced_films($films, $imported_pages) {
        $unsynced = [];
        foreach ($films as $film) {
            $film_id = $film['id'] ?? null;
            if (!$film_id) continue;
            if (!isset($imported_pages[$film_id])) {
                $unsynced[] = $film;
            }
        }
        return $unsynced;
    }

    /**
     * Generate HTML for imported films with pagination controls.
     * @param array $imported_pages
     * @param int $page
     * @param int $per_page
     * @return string
     */
    public function generate_imported_films_html($imported_pages, $page = 1, $per_page = 15) {
        if (empty($imported_pages)) return '';
        $total_pages = ceil(count($imported_pages) / $per_page);
        $offset = ($page - 1) * $per_page;
        $paged_imports = array_slice($imported_pages, $offset, $per_page, true);

        $html = '<div id="imported-films"><h3>Already Imported Films</h3>';
        $html .= '<table class="widefat fixed">';
        $html .= '<thead><tr><th>Title</th><th>Type</th><th>Status</th><th>Toggle</th><th>Categories</th><th>Tags</th></tr></thead><tbody>';

        foreach ($paged_imports as $film) {
            $post_id = $film['ID'];
            $post_type = get_post_type($post_id);
            $status = get_post_status($post_id);
            $url = $film['url'];
            $title = esc_html($film['title']);
            $status_label = ucfirst($status);
            $toggle_url = admin_url('post.php?action=edit&post=' . $post_id);

            // Categories and tags
            $categories = ($post_type === 'post') ? wp_get_post_categories($post_id, ['fields' => 'names']) : [];
            $tags = ($post_type === 'post') ? wp_get_post_tags($post_id, ['fields' => 'names']) : [];

            $category_list = !empty($categories) ? implode(', ', $categories) : '—';
            $tag_list = !empty($tags) ? implode(', ', $tags) : '—';

            $html .= "<tr>
                <td><a href='$url' target='_blank'>$title</a></td>
                <td>" . esc_html($post_type) . "</td>
                <td>$status_label</td>
                <td><a href='$toggle_url' class='button button-small'>Edit</a></td>
                <td>$category_list</td>
                <td>$tag_list</td>
            </tr>";
        }

        $html .= '</tbody></table>';
        // Add pagination controls
        if ($total_pages > 1) {
            $html .= '<div class="pagination-controls">';
            for ($i = 1; $i <= $total_pages; $i++) {
                $active = ($i === $page) ? 'active-page' : '';
                $html .= "<button class='pagination-button $active' data-import-page='$i'>$i</button>";
            }
            $html .= '</div>';
        }
        $html .= '<hr></div>';
        return $html;
    }

    public function generate_films_table_html($films, $imported_pages) {
        ob_start();
        ?>
        <table class="widefat fixed">
            <thead>
                <tr>
                    <th>Select</th>
                    <th>Film Name</th>
                    <th>Slug (Proposed URL)</th>
                    <th>Film ID</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($films as $film): ?>
                    <?php
                    $film_name = $film['name'];
                    $film_id = $film['id'] ?? 'N/A';
                    if (isset($imported_pages[$film_id])) continue;
                    $visibility = $film['visibility'] ?? 'hidden';
                    $post_status = ($visibility === 'published') ? 'publish' : 'draft';
                    $slug = sanitize_title($film_name);
                    $query = new WP_Query([
                        'post_type'   => 'page',
                        'title'       => $film_name,
                        'post_status' => 'any',
                        'fields'      => 'ids',
                    ]);
                    $existing_page_id = !empty($query->posts) ? $query->posts[0] : null;
                    $status = $existing_page_id ? 'Will Update' : 'Will Create';
                    ?>
                    <tr>
                        <td><input type="checkbox" class="film-select-checkbox" value="<?php echo esc_attr($film_id); ?>"></td>
                        <td><?php echo esc_html($film_name); ?></td>
                        <td><?php echo esc_html(site_url($slug)); ?></td>
                        <td><?php echo esc_html($film_id); ?></td>
                        <td><?php echo esc_html($status); ?> (<?php echo esc_html(ucfirst($post_status)); ?>)</td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
        <?php
        return ob_get_clean();
    }
}

class Eventive_Sync_Films {
    public function __construct() {
        add_action('admin_enqueue_scripts', [$this, 'enqueue_admin_styles']);
    }

    public function enqueue_admin_styles() {
        wp_enqueue_style(
            'eventive-film-sync-style',
            plugin_dir_url(__DIR__ . '') . 'css/FilmSync.css',
            [],
            '1.0.0'
        );
        // Inline style for .eventive-post-options if not present in CSS file
        echo '<style>
        .eventive-post-options {
          display: none;
          flex-direction: row;
          gap: 20px;
          margin-top: 1em;
        }
        .eventive-post-options.visible {
          display: flex;
        }
        .eventive-post-options > div {
          flex: 1;
        }
        </style>';
    }
    public function render_film_sync() {
        ob_start();
        // --- Save eventive_film_detail_page_id when form is submitted (enable/disable film sync) ---
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            if (isset($_POST['eventive_film_detail_page_id'])) {
                $updated_page_id = intval($_POST['eventive_film_detail_page_id']);
                update_option('eventive_film_detail_page_id', $updated_page_id);
            }
        }
        // --- Save film import options (post type, categories, tags) ---
        if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['eventive_film_options_action']) && $_POST['eventive_film_options_action'] === 'save_options') {
    $selected_post_type = sanitize_text_field($_POST['eventive_film_post_type']);
    update_option('eventive_film_post_type', $selected_post_type);

    $selected_categories = isset($_POST['eventive_film_categories']) ? array_map('intval', (array) $_POST['eventive_film_categories']) : [];
    $selected_tags = isset($_POST['eventive_film_tags']) ? array_map('intval', (array) $_POST['eventive_film_tags']) : [];

    update_option('eventive_film_categories', $selected_categories);
    update_option('eventive_film_tags', $selected_tags);

    // NEW: Parent page options
    $use_parent = isset($_POST['eventive_film_use_parent']) ? '1' : '0';
    $parent_page_id = isset($_POST['eventive_film_parent_page_id']) ? intval($_POST['eventive_film_parent_page_id']) : 0;
    update_option('eventive_film_use_parent', $use_parent);
    update_option('eventive_film_parent_page_id', $parent_page_id);
}
        // Output the Enable Film Sync checkbox form with explicit checkbox inline
        // Always load and update selected page option, regardless of $enabled
        // If no page is selected, it will default to "None" in the dropdown
        $selected_page_id = get_option('eventive_film_detail_page_id', 0);
        $page = get_post($selected_page_id);
        if (!$page || $page->post_status !== 'publish') {
            $selected_page_id = 0;
        }
        echo '<form method="post" action="options.php" style="margin-bottom:20px;">';
        settings_fields('eventive-film-sync');
        echo '<input type="hidden" name="eventive_film_detail_page_id" value="' . esc_attr($selected_page_id) . '">';
        $enabled = get_option('eventive_enable_film_sync', '0');
        echo '<label><input type="checkbox" name="eventive_enable_film_sync" value="1" ' . checked(1, $enabled, false) . '> Enable Film Sync</label>';
        // Remove submit_button and add JS for auto-submit on checkbox change
        echo '<script>
            document.addEventListener("DOMContentLoaded", function () {
                const checkbox = document.querySelector("input[name=\'eventive_enable_film_sync\']");
                if (checkbox) {
                    checkbox.addEventListener("change", function () {
                        checkbox.form.submit();
                    });
                }
            });
        </script>';
        echo '</form>';

        // --------- Insert page selection UI for film detail page ---------

        // Handle form submission for selecting/creating detail page
        if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['eventive_detail_page_action'])) {
            if ($_POST['eventive_detail_page_action'] === 'select') {
                $selected_page_id = intval($_POST['film_detail_page']);
                update_option('eventive_film_detail_page_id', $selected_page_id);

                // Prepend shortcode to the page content if not present
                $page = get_post($selected_page_id);
                if ($page && strpos($page->post_content, '[eventive-film-details') === false) {
                    $updated_content = "[eventive-film-details]\n\n" . $page->post_content;
                    wp_update_post([
                        'ID' => $selected_page_id,
                        'post_content' => $updated_content
                    ]);
                }
            } elseif ($_POST['eventive_detail_page_action'] === 'create') {
                $new_page_id = wp_insert_post([
                    'post_title'   => 'Eventive Film Viewer',
                    'post_content' => '[eventive-film-details]',
                    'post_status'  => 'publish',
                    'post_type'    => 'page',
                ]);
                if ($new_page_id) {
                    update_option('eventive_film_detail_page_id', $new_page_id);
                    $selected_page_id = $new_page_id;
                }
            }
        }

        // Ensure $selected_page_id is initialized before the conditional block
        if ($enabled !== '1') {
            echo '<div class="notice notice-info"><p>Using single page film view. <br />Enable film sync above to import individual films to posts or pages.</p></div>';
            // Render form
            echo '<h2>Select Film Detail Page</h2>';
            echo '<form method="post">';
            echo '<input type="hidden" name="eventive_detail_page_action" value="select">';
            // Use the improved select rendering logic for film_detail_page
            echo '<select name="film_detail_page">';
            $pages = get_pages(['post_status' => 'publish']);
            if (!$selected_page_id) {
                echo "<option value='' selected>Nothing Selected</option>";
            }
            foreach ($pages as $page) {
                $selected = ($page->ID == $selected_page_id) ? 'selected' : '';
                echo "<option value='{$page->ID}' $selected>{$page->post_title}</option>";
            }
            echo '</select> ';
            submit_button('Save Detail Page', 'primary', '', false);
            echo '&nbsp;';
            echo '<button type="submit" name="eventive_detail_page_action" value="create" class="button">Create New Detail Page</button>';
            echo '</form>';

            return ob_get_clean();
        }
        // --------- End page selection UI ---------

        // --------- Film Import Options: Post Type, Categories, Tags ---------
        $post_type = get_option('eventive_film_post_type', 'page');
        $categories = get_categories(['hide_empty' => false]);
        $tags = get_tags(['hide_empty' => false]);
        $selected_categories = get_option('eventive_film_categories', []);
        $selected_tags = get_option('eventive_film_tags', []);
        echo '<h2>Film Import Options</h2>';
        echo '<form method="post">';
        echo '<input type="hidden" name="eventive_film_options_action" value="save_options">';
        // Begin flex container for post type + categories/tags
        echo '<div style="display: flex; gap: 20px; align-items: flex-start;">';
        // Post type dropdown
        echo '<div style="width: 200px;">';
        echo '<label><strong>Import Films As:</strong></label><br>';
        echo '<select name="eventive_film_post_type">';
        echo '<option value="page"' . selected($post_type, 'page', false) . '>Pages</option>';
        echo '<option value="post"' . selected($post_type, 'post', false) . '>Posts</option>';
        echo '</select></div>';
        // Categories/tags container
        echo '<div id="post-options" class="eventive-post-options ' . ($post_type === 'post' ? 'visible' : 'hidden') . '">';
        if ($post_type === 'post') {
            echo '<div><label><strong>Select Categories:</strong></label><br>';
            echo '<select name="eventive_film_categories[]" multiple style="height: 100px; width: 100%;">';
            foreach ($categories as $cat) {
                $selected = in_array($cat->term_id, (array) $selected_categories) ? 'selected' : '';
                echo "<option value='{$cat->term_id}' $selected>{$cat->name}</option>";
            }
            echo '</select></div>';
            echo '<div><label><strong>Select Tags:</strong></label><br>';
            echo '<select name="eventive_film_tags[]" multiple style="height: 100px; width: 100%;">';
            foreach ($tags as $tag) {
                $selected = in_array($tag->term_id, (array) $selected_tags) ? 'selected' : '';
                echo "<option value='{$tag->term_id}' $selected>{$tag->name}</option>";
            }
            echo '</select></div>';
        }
        echo '</div>'; // closes post-options
        echo '</div>'; // closes flex container
        submit_button('Save Import Settings');
        echo '</form>';
        // Add JS to toggle #post-options when dropdown changes
        echo '<script>
document.addEventListener("DOMContentLoaded", function () {
    const typeSelect = document.querySelector("select[name=\'eventive_film_post_type\']");
    const postOptions = document.getElementById("post-options");
    if (typeSelect && postOptions) {
        typeSelect.addEventListener("change", function () {
            if (this.value === "post") {
                postOptions.classList.add("visible");
                postOptions.classList.remove("hidden");
            } else {
                postOptions.classList.remove("visible");
                postOptions.classList.add("hidden");
            }
        });
    }
});
</script>';

        $filmSyncService = new FilmSyncService();
        $imported_pages = $filmSyncService->get_imported_pages();
        ?>
        <div id="eventive-film-sync">
            <div id="films-preview" style="margin-top: 20px;">
                <div id="imported-films"></div>
                <div id="imported-pagination-controls" class="pagination-controls"></div>
                <div id="unsynced-films"></div>
                <div id="unsynced-pagination-controls" class="pagination-controls"></div>
            </div>
            <button id="load-films-button" class="button-primary">Load Latest Films from Eventive</button>
            <button id="sync-films-button" class="button-primary" style="display:none; margin-top: 20px;">Sync Films</button>
        </div>
        <script>
            console.log("🚀 Script loaded");
        document.addEventListener('DOMContentLoaded', function () {
            console.log("✅ DOM fully loaded, attaching event listeners...");
            let selectedFilmIds = new Set();
            const loadButton = document.getElementById('load-films-button');
            const syncButton = document.getElementById('sync-films-button');
            const previewDiv = document.getElementById('films-preview');

            // --- Move updateSelectedCount to top-level of DOMContentLoaded ---
            function updateSelectedCount() {
                const badge = document.getElementById('selected-count-badge');
                if (badge) badge.textContent = `Selected: ${selectedFilmIds.size}`;
                console.log('Updated selected count:', selectedFilmIds.size);
            }

            // --- Move renderSelectAllControls to top-level of DOMContentLoaded ---
            function renderSelectAllControls(container) {
                const div = document.createElement('div');
                div.className = 'select-all-controls';

                const selectAll = document.createElement('button');
                selectAll.textContent = 'Select All';
                selectAll.type = 'button';
                selectAll.className = 'button button-secondary debug-control-btn';
                selectAll.onclick = () => {
                    console.log('Select All clicked');
                    const checkboxes = document.querySelectorAll('.film-select-checkbox');
                    console.log('Checkboxes found:', checkboxes.length);
                    checkboxes.forEach(cb => {
                        cb.checked = true;
                        selectedFilmIds.add(cb.value);
                    });
                    updateSelectedCount();
                };

                const deselectAll = document.createElement('button');
                deselectAll.textContent = 'Deselect All';
                deselectAll.type = 'button';
                deselectAll.className = 'button button-secondary debug-control-btn';
                deselectAll.onclick = () => {
                    console.log('Deselect All clicked');
                    const checkboxes = document.querySelectorAll('.film-select-checkbox');
                    console.log('Checkboxes found:', checkboxes.length);
                    checkboxes.forEach(cb => {
                        cb.checked = false;
                        selectedFilmIds.delete(cb.value);
                    });
                    updateSelectedCount();
                };

                const selectedCountBadge = document.createElement('span');
                selectedCountBadge.id = 'selected-count-badge';
                selectedCountBadge.style.marginLeft = '10px';
                selectedCountBadge.style.fontWeight = 'bold';
                updateSelectedCount();

                div.appendChild(selectAll);
                div.appendChild(deselectAll);
                div.appendChild(selectedCountBadge);
                container.appendChild(div);
            }

            // Render pagination for unsynced films
            function renderUnsyncedPagination(totalPages, currentPage) {
                const controlsContainer = document.getElementById('unsynced-pagination-controls');
                if (!controlsContainer) return;
                controlsContainer.innerHTML = '';
                for (let i = 1; i <= totalPages; i++) {
                    const button = document.createElement('button');
                    button.textContent = i;
                    button.classList.add('pagination-button');
                    if (i === currentPage) button.classList.add('active-page');
                    button.setAttribute('data-page', i);
                    controlsContainer.appendChild(button);
                }
            }

            // Render pagination for imported films
            function renderImportedPagination(totalPages, currentPage) {
                const controlsContainer = document.getElementById('imported-pagination-controls');
                if (!controlsContainer) return;
                controlsContainer.innerHTML = '';
                for (let i = 1; i <= totalPages; i++) {
                    const button = document.createElement('button');
                    button.textContent = i;
                    button.classList.add('pagination-button');
                    if (i === currentPage) button.classList.add('active-page');
                    button.setAttribute('data-import-page', i);
                    controlsContainer.appendChild(button);
                }
            }

            // Accepts imported pagination info
            function renderFilmsTable(films, importedFilms, importedPageInfo = {}, unsyncedPageInfo = {}) {
                // Render imported films section
                let importedHtml = '';
                console.log('Rendering imported films table. Film count:', importedFilms?.data?.length || 0);
                if (importedFilms && importedFilms.data && importedFilms.data.length > 0) {
                    importedHtml += `<h3>Already Imported Films</h3>
      <table class="eventive-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Type</th>
            <th>Status</th>
            <th>Toggle</th>
            <th>Categories</th>
            <th>Tags</th>
          </tr>
        </thead>
        <tbody>`;
                    importedFilms.data.forEach(film => {
                        const title = film.title;
                        const url = film.url;
                        const status = film.status.charAt(0).toUpperCase() + film.status.slice(1);
                        const type = film.post_type || 'page';
                        // Toggle button logic
                        // Use status to determine action: if published, show Unpublish, otherwise Publish
                        const toggleAction = (film.status === 'published') ? 'Unpublish' : 'Publish';
                        const toggleButton = `<button class="eventive-toggle-status button button-small" data-post-id="${film.ID}" data-action="${toggleAction}">${toggleAction === 'Publish' ? 'Publish now' : 'Make Draft'}</button>`;
                        const categories = film.categories ? film.categories.join(', ') : '—';
                        const tags = film.tags ? film.tags.join(', ') : '—';

                        importedHtml += `<tr>
            <td><a href="${url}" target="_blank">${title}</a></td>
            <td>${type}</td>
            <td>${status}</td>
            <td>${toggleButton}</td>
            <td>${categories}</td>
            <td>${tags}</td>
          </tr>`;
                    });
                    importedHtml += `</tbody></table>`;
                    // We'll inject imported film pagination after the DOM is updated
                }

                let unsyncedHtml = '';
                // Table of films to import
                unsyncedHtml += `<table class="widefat fixed film-sync-table">
                    <thead>
                        <tr>
                            <th style="width: 50px;">Select</th>
                            <th>Film Name</th>
                            <th>Slug (Proposed URL)</th>
                            <th>Film ID</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>`;
                films.forEach(film => {
                    let slug = film.slug || '';
                    let filmId = film.id || '';
                    let status = film.status || '';
                    let postStatus = film.post_status || '';
                    let filmName = film.name || '';
                    unsyncedHtml += `<tr>
                        <td><input type="checkbox" class="film-select-checkbox" value="${filmId}" ${selectedFilmIds.has(filmId) ? 'checked' : ''}></td>
                        <td>${filmName}</td>
                        <td>${slug}</td>
                        <td>${filmId}</td>
                        <td>${status} (${postStatus.charAt(0).toUpperCase() + postStatus.slice(1)})</td>
                    </tr>`;
                });
                unsyncedHtml += `</tbody></table>`;

                // Granular DOM updates for imported and unsynced films
                const importedSection = document.getElementById('imported-films');
                if (importedSection) {
                    console.log('Replacing #imported-films content. Length before:', importedSection.innerHTML.length);
                    importedSection.innerHTML = importedHtml;
                    console.log('Updated #imported-films content. Length after:', importedSection.innerHTML.length);
                }
                const unsyncedSection = document.getElementById('unsynced-films');
                if (unsyncedSection) {
                    console.log('Replacing #unsynced-films content. Length before:', unsyncedSection.innerHTML.length);
                    unsyncedSection.innerHTML = '';
                    // Add controls and table to unsynced section
                    const controlsTop = document.createElement('div');
                    renderSelectAllControls(controlsTop);
                    unsyncedSection.appendChild(controlsTop);
                    const tableWrapper = document.createElement('div');
                    tableWrapper.innerHTML = unsyncedHtml;
                    unsyncedSection.appendChild(tableWrapper);
                    console.log('Updated #unsynced-films content. Length after:', unsyncedSection.innerHTML.length);
                }

                // Render pagination controls for imported and unsynced films
                renderImportedPagination(importedPageInfo.total_pages, importedPageInfo.current_page);
                renderUnsyncedPagination(unsyncedPageInfo.total_pages, unsyncedPageInfo.current_page);

                document.querySelectorAll('.film-select-checkbox').forEach(cb => {
                    cb.addEventListener('change', function () {
                        if (this.checked) {
                            selectedFilmIds.add(this.value);
                        } else {
                            selectedFilmIds.delete(this.value);
                        }
                        updateSelectedCount();
                    });
                });
            }

            // Track current imported films page for pagination
            let currentImportedPage = 1;
            let importedTotalPages = 1;

            function loadFilms(page = 1, importedPage = 1) {
                loadButton.disabled = true;
                loadButton.textContent = 'Loading...';
                // Support pagination parameters
                let url = '<?php echo admin_url('admin-ajax.php?action=preview_eventive_films'); ?>';
                url += '&page=' + encodeURIComponent(page);
                url += '&imported_page=' + encodeURIComponent(importedPage);
                fetch(url)
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            // Films: data.data.films, Imported: data.data.imported_films
                            // Add imported films pagination info if available
                            let importedFilms = { data: data.data.imported_films };
                            let importedPageInfo = {};
                            if (data.data.imported_total_pages) {
                                importedPageInfo.total_pages = data.data.imported_total_pages;
                                importedPageInfo.current_page = data.data.imported_current_page;
                                currentImportedPage = importedPageInfo.current_page;
                                importedTotalPages = importedPageInfo.total_pages;
                            } else {
                                importedPageInfo.total_pages = 1;
                                importedPageInfo.current_page = 1;
                                currentImportedPage = 1;
                                importedTotalPages = 1;
                            }
                            // Unsynced films pagination info
                            let unsyncedPageInfo = {};
                            if (data.data.total_pages) {
                                unsyncedPageInfo.total_pages = data.data.total_pages;
                                unsyncedPageInfo.current_page = data.data.current_page;
                            } else {
                                unsyncedPageInfo.total_pages = 1;
                                unsyncedPageInfo.current_page = 1;
                            }
                            renderFilmsTable(data.data.films, importedFilms, importedPageInfo, unsyncedPageInfo);
                            syncButton.style.display = 'inline-block';
                            loadButton.style.display = 'none';
                        } else {
                            previewDiv.innerHTML = `<div class="error">Error: ${data.data.message || 'Unknown error occurred.'}</div>`;
                        }
                    })
                    .catch(error => {
                        previewDiv.innerHTML = `<div class="error">Error loading films: ${error.message}</div>`;
                    })
                    .finally(() => {
                        loadButton.disabled = false;
                        loadButton.textContent = 'Load Latest Films from Eventive';
                        // After load, setup pagination button listeners for both unsynced and imported films
                        setTimeout(() => {
                            // Unsynced films pagination
                            const unsyncedButtons = document.querySelectorAll('.pagination-button[data-page]');
                            unsyncedButtons.forEach(btn => {
                                btn.addEventListener('click', function (e) {
                                    const page = parseInt(this.getAttribute('data-page'), 10);
                                    if (!isNaN(page)) {
                                        e.preventDefault();
                                        loadFilms(page, 1); // Keep imported on page 1
                                    }
                                });
                            });
                            // Imported films pagination
                            const importedButtons = document.querySelectorAll('.pagination-button[data-import-page]');
                            importedButtons.forEach(btn => {
                                btn.addEventListener('click', function (e) {
                                    const page = parseInt(this.getAttribute('data-import-page'), 10);
                                    if (!isNaN(page)) {
                                        e.preventDefault();
                                        loadFilms(1, page); // Keep unsynced on page 1
                                    }
                                });
                            });
                        }, 100);
                    });
            }
            // Trigger initial load on page load
            loadFilms();
            loadButton.addEventListener('click', function () {
                loadFilms();
            });
            syncButton.addEventListener('click', function () {
                syncButton.disabled = true;
                syncButton.textContent = 'Syncing...';
                const selectedIdsArray = Array.from(selectedFilmIds);
                fetch('<?php echo admin_url('admin-ajax.php?action=sync_eventive_films'); ?>', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({ film_ids: JSON.stringify(selectedIdsArray) })
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            const msg = data.message || 'Films synced successfully!';
                            // Replace confirm with alert and auto-refresh after OK
                            alert(msg);
                            window.location.href = window.location.href;
                        } else {
                            alert(`Error syncing films: ${data.message || 'Unknown error occurred.'}`);
                        }
                    })
                    .catch(error => {
                        alert(`Error syncing films: ${error.message}`);
                    })
                    .finally(() => {
                        syncButton.disabled = false;
                        syncButton.textContent = 'Sync Films';
                    });
            });
        // Delegated event listener for status toggle buttons
        document.addEventListener('click', async function (e) {
          const button = e.target.closest('.eventive-toggle-status');
          if (button) {
            console.log("🔘 Button clicked:", button);

            const postId = button.getAttribute('data-post-id');
            const action = button.getAttribute('data-action');
            console.log(`Toggling post ID ${postId} to ${action}`);

            const formData = new FormData();
            formData.append('action', 'eventive_toggle_post_status');
            formData.append('post_id', postId);
            formData.append('toggle_action', action);

            try {
              const response = await fetch(ajaxurl, {
                method: 'POST',
                body: formData,
              });

              const result = await response.json();
              console.log("📩 Server response:", result);

              if (result.success) {
                alert(result.message || 'Status updated.');
                location.reload();
              } else {
                alert('❌ Failed to update post status');
                console.error(result);
              }
            } catch (error) {
              console.error("⚠️ AJAX error:", error);
            }
          }
        });
        });
        </script>
        <?php
        return ob_get_clean();
    }
}

// AJAX handler for previewing films
add_action('wp_ajax_preview_eventive_films', 'preview_eventive_films');

function preview_eventive_films() {
    $filmSyncService = new FilmSyncService();
    list($event_bucket, $api_key) = $filmSyncService->get_eventive_api_credentials();
    if (!$event_bucket || !$api_key) {
        wp_send_json_error(['message' => 'API credentials are missing.']);
        return;
    }
    $refresh = isset($_GET['refresh']) && $_GET['refresh'] == '1';
    // Extract and validate pagination parameters
    $page = isset($_GET['page']) ? intval($_GET['page']) : 1;
    $per_page = isset($_GET['per_page']) ? intval($_GET['per_page']) : 15;
    $page = max(1, $page);
    $per_page = max(1, $per_page);
    // Pagination for imported films
    $imported_page = isset($_GET['imported_page']) ? intval($_GET['imported_page']) : 1;
    $imported_per_page = isset($_GET['imported_per_page']) ? intval($_GET['imported_per_page']) : 15;
    $imported_page = max(1, $imported_page);
    $imported_per_page = max(1, $imported_per_page);

    // No more HTML cache, always fetch fresh data if requested
    $imported_pages = $filmSyncService->get_imported_pages();
    $films = $filmSyncService->fetch_eventive_films($event_bucket, $api_key);
    if (is_wp_error($films)) {
        wp_send_json_error(['message' => $films->get_error_message()]);
        return;
    }
    if (empty($films)) {
        wp_send_json_error(['message' => 'No films found in the Eventive API response.']);
        return;
    }
    // Prepare imported films for JS with pagination
    $imported_pages_vals = array_values($imported_pages);
    $imported_total_pages = ceil(count($imported_pages_vals) / $imported_per_page);
    $imported_offset = ($imported_page - 1) * $imported_per_page;
    $imported_paged = array_slice($imported_pages_vals, $imported_offset, $imported_per_page);
    $imported_films = array_map(function($film) {
        $post_id = $film['ID'];
        $post_type = get_post_type($post_id);
        $categories = ($post_type === 'post') ? wp_get_post_categories($post_id, ['fields' => 'names']) : [];
        $tags = ($post_type === 'post') ? wp_get_post_tags($post_id, ['fields' => 'names']) : [];
        return [
            'ID' => $film['ID'],
            'title' => $film['title'],
            'status' => $film['status'].'ed',
            'url' => $film['url'],
            'post_type' => $post_type,
            'categories' => !empty($categories) ? array_values($categories) : [],
            'tags' => !empty($tags) ? array_values($tags) : [],
        ];
    }, $imported_paged);

    // Prepare unsynced films for JS
    $unsynced_films = [];
    foreach ($films as $film) {
        $film_id = $film['id'] ?? null;
        if (!$film_id || isset($imported_pages[$film_id])) continue;
        $film_name = $film['name'] ?? '';
        $visibility = $film['visibility'] ?? 'hidden';
        $post_status = ($visibility === 'published') ? 'publish' : 'draft';
        $slug = sanitize_title($film_name);
        $query = new WP_Query([
            'post_type'   => 'page',
            'title'       => $film_name,
            'post_status' => 'any',
            'fields'      => 'ids',
        ]);
        $existing_page_id = !empty($query->posts) ? $query->posts[0] : null;
        $status = $existing_page_id ? 'Will Update' : 'Will Create';
        $unsynced_films[] = [
            'id' => $film_id,
            'name' => $film_name,
            'slug' => site_url($slug),
            'status' => $status,
            'post_status' => $post_status,
            'excerpt' => eventive_build_film_excerpt($film, 180),
        ];
    }
    // Paginate the unsynced films array
    $total_films = count($unsynced_films);
    $total_pages = ($per_page > 0) ? (int) ceil($total_films / $per_page) : 1;
    $offset = ($page - 1) * $per_page;
    $paged_films = array_slice($unsynced_films, $offset, $per_page);

    wp_send_json_success([
        'films' => $paged_films,
        'imported_films' => $imported_films,
        'total_pages' => $total_pages,
        'current_page' => $page,
        'imported_total_pages' => $imported_total_pages,
        'imported_current_page' => $imported_page,
    ]);
}

/**
 * Sync films with WordPress.
 */
function sync_eventive_films_with_wordpress() {
    error_log('sync_eventive_films_with_wordpress function triggered.');

    $options = get_option('eventive_admin_options_option_name');
    $event_bucket = $options['your_eventive_event_bucket_1'] ?? '';
    $api_key = $options['your_eventive_secret_key_2'] ?? '';

    if (!$event_bucket || !$api_key) {
        $error_message = 'Eventive API credentials are missing.';
        error_log($error_message);
        wp_send_json_error(['message' => $error_message], 400);
        return;
    }

    $selected_film_ids = json_decode(stripslashes($_POST['film_ids'] ?? '[]'), true);
    if (!is_array($selected_film_ids)) $selected_film_ids = [];

    $url = "https://api.eventive.org/event_buckets/$event_bucket/films";
    error_log("Fetching films from Eventive API: $url");

    // Fetch film data from Eventive API
    $response = wp_remote_get($url, [
        'headers' => ['x-api-key' => $api_key],
    ]);

    if (is_wp_error($response)) {
        $error_message = 'Failed to fetch Eventive films: ' . $response->get_error_message();
        error_log($error_message);
        wp_send_json_error(['message' => $error_message], 500);
        return;
    }

    $body = wp_remote_retrieve_body($response);
    $films = json_decode($body, true);

    if (empty($films['films'])) {
        $error_message = 'No films found in the Eventive API response.';
        error_log($error_message);
        wp_send_json_error(['message' => $error_message], 404);
        return;
    }

    $films = $films['films'];
    error_log('Number of films fetched: ' . count($films));

    // Get user settings for post type, categories, and tags
    $post_type = get_option('eventive_film_post_type', 'page');
    $categories = get_option('eventive_film_categories', []);
    $tags = get_option('eventive_film_tags', []);

    $synced_count = 0;

    foreach ($films as $film) {
        if (!in_array($film['id'], $selected_film_ids)) {
            continue;
        }

        $film_name = $film['name'] ?? 'Untitled Film';
        $film_id = $film['id'] ?? null;

        if (empty($film_id)) {
            error_log("Skipping film without ID: $film_name");
            continue;
        }

        $film_description = $film['description'] ?? '';
        $cover_image = $film['cover_image'] ?? '';
        $still_image = $film['still_image'] ?? '';
        $featured_image_url = !empty($cover_image) ? $cover_image : $still_image;
        $visibility = $film['visibility'] ?? 'hidden';
        // NEW: Build a clean page excerpt for SEO/OG using logline + details
        $post_excerpt = eventive_build_film_excerpt($film, 180);

        error_log("Processing film: $film_name, ID: $film_id, Visibility: $visibility");

        // Prepare the content with the shortcode
        $shortcode_block = "[eventive-film-details film-id=\"$film_id\"]";

        // Check if a post/page for this film already exists
        $query = new WP_Query([
            'post_type'   => $post_type,
            'title'       => $film_name,
            'post_status' => 'any',
            'fields'      => 'ids',
        ]);

        $existing_page_id = !empty($query->posts) ? $query->posts[0] : null;
        $post_status = ($visibility === 'published') ? 'publish' : 'draft';

        try {
            if ($existing_page_id) {
                wp_update_post([
                    'ID'           => $existing_page_id,
                    'post_content' => $shortcode_block,
                    'post_status'  => $post_status,
                    'post_type'    => $post_type,
                    'post_excerpt' => $post_excerpt,
                ]);
                // Ensure the _eventive_film_id meta field is set
                update_post_meta($existing_page_id, '_eventive_film_id', $film_id);
                update_post_meta($existing_page_id, '_eventive_loader_override', sanitize_text_field($event_bucket));
                error_log("Updated $post_type for film: $film_name (ID: $existing_page_id)");

                if (!empty($featured_image_url)) {
                    set_featured_image($featured_image_url, $existing_page_id);
                }
                // Assign categories and tags if post type is post
                if ($post_type === 'post') {
                    if (!empty($categories)) wp_set_post_categories($existing_page_id, $categories);
                    if (!empty($tags)) wp_set_post_tags($existing_page_id, $tags);
                }
            } else {
                $new_page_id = wp_insert_post([
                    'post_title'   => $film_name,
                    'post_content' => $shortcode_block,
                    'post_status'  => $post_status,
                    'post_type'    => $post_type,
                    'post_excerpt' => $post_excerpt,
                ]);
                // Ensure the _eventive_film_id meta field is set
                update_post_meta($new_page_id, '_eventive_film_id', $film_id);
                update_post_meta($new_page_id, '_eventive_loader_override', sanitize_text_field($event_bucket));

                if (!empty($featured_image_url)) {
                    set_featured_image($featured_image_url, $new_page_id);
                }
                // Assign categories and tags if post type is post
                if ($post_type === 'post') {
                    if (!empty($categories)) wp_set_post_categories($new_page_id, $categories);
                    if (!empty($tags)) wp_set_post_tags($new_page_id, $tags);
                }
                error_log("Created $post_type for film: $film_name (ID: $new_page_id)");
            }
            $synced_count++;
        } catch (Exception $e) {
            error_log("Error processing film: $film_name - " . $e->getMessage());
        }
    }

    $success_message = "$synced_count films successfully synced.";
    error_log($success_message);
    wp_send_json_success([
        'message' => $success_message,
        'refresh' => true,
    ]);
}

/**
 * Set a featured image for a post.
 */
function set_featured_image($image_url, $post_id) {
    $image = media_sideload_image($image_url, $post_id, null, 'id');

    if (is_wp_error($image)) {
        error_log('Failed to set featured image: ' . $image->get_error_message());
        return;
    }

    set_post_thumbnail($post_id, $image);
}

// Register the AJAX handler
add_action('wp_ajax_sync_eventive_films', 'sync_eventive_films_with_wordpress');
// Register AJAX handler for toggling post status
add_action('wp_ajax_eventive_toggle_post_status', function() {
    $post_id = intval($_POST['post_id']);
    $action = sanitize_text_field($_POST['toggle_action']);
    $new_status = ($action === 'Publish') ? 'publish' : 'draft';
    $result = wp_update_post(['ID' => $post_id, 'post_status' => $new_status]);
    if ($result) {
      wp_send_json_success(['message' => "Post status changed to $new_status"]);
    } else {
      wp_send_json_error(['message' => 'Failed to update post status']);
    }
});