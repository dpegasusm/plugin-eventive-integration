const EventiveUtils = (() => {
    function showLoader(container) {
        if (container) {
            console.log('Showing loader in container:', container);
            container.style.display = 'flex';
        } else {
            console.warn('No container provided for showing loader.');
        }
    }

    function hideLoader(container) {
        if (container) {
            console.log('Hiding loader in container:', container);
            container.style.display = 'none';
        } else {
            console.warn('No container provided for hiding loader.');
        }
    }

    function clearContent(container, contentClearCallback) {
        console.log('Clearing content for container:', container);
        if (contentClearCallback && typeof contentClearCallback === 'function') {
            contentClearCallback();
        }
        if (container) {
            showLoader(container); // Show loader after clearing content
        }
    }

    function updateLoginState(fetchDataCallback, container, clearDataCallback) {
        if (!window.Eventive) {
            console.error('Eventive API not available during login state update.');
            return;
        }

        if (Eventive.isLoggedIn()) {
            console.log('User is logged in.');
            hideLoader(container);
            fetchDataCallback();
        } else {
            console.log('User is logged out.');
            clearContent(container, clearDataCallback);
        }
    }

    function initializeEventive(fetchDataCallback, container, clearDataCallback) {
        if (!window.Eventive) {
            console.error('Eventive API is not available. Aborting initialization.');
            return;
        }

        console.log('Initializing Eventive...');
        Eventive.on('ready', () => {
            console.log('Eventive Everywhere is ready.');

            // Handle initial state
            updateLoginState(fetchDataCallback, container, clearDataCallback);

            // Listen for login/logout events
            console.log('Setting up Eventive login/logout state listeners.');

            // Use a MutationObserver to monitor changes in logged-in state
            let previousState = Eventive.isLoggedIn();

            setInterval(() => {
                const currentState = Eventive.isLoggedIn();
                if (currentState !== previousState) {
                    console.log('Login state changed:', currentState);
                    previousState = currentState;
                    updateLoginState(fetchDataCallback, container, clearDataCallback);
                }
            }, 3000); // Check every 3 seconds
        });
    }

    return {
        showLoader,
        hideLoader,
        initializeEventive,
    };
})();