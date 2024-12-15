document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('config-form');
    if (!form) return; // Only run on pages with the config form

    const submitButton = form.querySelector('button[type="submit"]');
    const inputs = form.querySelectorAll('input[required]');

    // Function to check if all fields are valid
    function checkFormValidity() {
        let isValid = true;
        inputs.forEach(input => {
            if (!input.value || (input.id === 'pin' && input.value.length < 6)) {
                isValid = false;
            }
        });
        submitButton.disabled = !isValid;
    }

    // Add input listeners to all required fields
    inputs.forEach(input => {
        input.addEventListener('input', checkFormValidity);
    });

    // Handle form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        submitButton.disabled = true;
        submitButton.textContent = 'Creating...';

        const formData = {
            workspace_name: form.workspace_name.value,
            workspace_key: form.workspace_key.value,
            subscription_key: form.subscription_key.value,
            uploader_name: form.uploader_name.value,
            pin: form.pin.value
        };

        try {
            const response = await fetch('/api/v1/config/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Failed to create config');
            }

            const blob = await response.blob();
            const fileName = `${formData.workspace_name}-${formData.uploader_name}.mydre`;
            
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            // Reset form
            form.reset();
            submitButton.textContent = 'Create and Download Config';
            submitButton.disabled = true;

        } catch (error) {
            console.error('Error:', error);
            submitButton.textContent = 'Create and Download Config';
            submitButton.disabled = false;
            alert('Failed to create configuration. Please try again.');
        }
    });
});
