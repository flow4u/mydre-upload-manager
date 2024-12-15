// Main JavaScript initialization
document.addEventListener('DOMContentLoaded', function() {
    // Initialize MDL components
    if (typeof componentHandler !== 'undefined') {
        componentHandler.upgradeDom();
    }

    // Global error handler
    window.onerror = function(msg, url, lineNo, columnNo, error) {
        console.error('Error: ' + msg + '\nURL: ' + url + '\nLine: ' + lineNo + '\nColumn: ' + columnNo + '\nError object: ' + JSON.stringify(error));
        return false;
    };

    // Prevent external scripts from interfering with our app
    window.addEventListener('error', function(e) {
        if (e.filename && !e.filename.includes(window.location.origin)) {
            e.stopPropagation();
            return false;
        }
    }, true);

    // Handle file input display
    const fileInput = document.querySelector(".mdl-button--file input[type=file]");
    if (fileInput) {
        fileInput.addEventListener("change", function() {
            const fileLabel = document.querySelector(".file-label");
            if (fileLabel) {
                fileLabel.textContent = this.files[0]?.name || "No file chosen";
            }
        });
    }

    // Handle form submissions
    const forms = document.querySelectorAll("form");
    forms.forEach(form => {
        form.addEventListener("submit", function(e) {
            e.preventDefault();
            const submitBtn = form.querySelector("button[type=submit]");
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = "Processing...";
            }
            // Form submission logic will be added later
        });
    });
});
