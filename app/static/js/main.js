// Main JavaScript file
document.addEventListener("DOMContentLoaded", function() {
    // Auto-register all MDL components
    componentHandler.upgradeDom();

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
