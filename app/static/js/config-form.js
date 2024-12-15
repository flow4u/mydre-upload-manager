document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('config-form');
    if (!form) return; // Only run on pages with the config form

    const submitButton = form.querySelector('button[type="submit"]');
    const inputs = form.querySelectorAll('input[required]');

    // Define the order of fields
    const fields = [
        'workspace_name',
        'workspace_key',
        'subscription_key',
        'uploader_name',
        'pin'
    ];

    // Add keydown event listeners to each field
    fields.forEach((fieldId, index) => {
        const field = document.getElementById(fieldId);
        if (!field) return;

        field.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault(); // Prevent default tab behavior
                
                // Move to next field
                const nextIndex = index + 1;
                if (nextIndex < fields.length) {
                    // Focus next field
                    const nextField = document.getElementById(fields[nextIndex]);
                    if (nextField) {
                        nextField.focus();
                    }
                } else {
                    // If it's the last field, submit the form
                    if (form.checkValidity()) {
                        form.dispatchEvent(new Event('submit'));
                    }
                }
            }
        });
    });

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

    function sanitize(name) {
        // If it's an email, take only the part before @
        if (name.includes('@')) {
            name = name.split('@')[0];
        }
        // Remove dots and special characters
        name = name.replace(/\./g, '');
        // Keep only alphanumeric, underscore, and hyphen
        name = name.replace(/[^\w\-]/g, '');
        // Remove leading/trailing underscores or hyphens
        name = name.replace(/^[-_]+|[-_]+$/g, '');
        return name;
    }

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

        const sanitized_name = sanitize(formData.uploader_name);
        const fileName = `${formData.workspace_name}-${sanitized_name}.mydre`;

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

    // Add decryption handling
    const decryptButton = document.getElementById('decryptButton');
    const pinInput = document.getElementById('filePin');
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    let currentFile = null;

    if (dropZone && fileInput) {
        // Click handler
        dropZone.addEventListener('click', () => {
            fileInput.click();
        });

        // Drag & Drop handlers
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                fileInput.files = files;
                handleFile(files[0]);
            }
        });

        // File input change handler
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFile(e.target.files[0]);
            }
        });
    }

    function handleFile(file) {
        if (!file.name.endsWith('.mydre')) {
            alert('Please select a .mydre file');
            return;
        }
        
        // Update selected file display
        const selectedFileDiv = document.getElementById('selectedFile');
        const fileNameSpan = selectedFileDiv.querySelector('.file-name');
        const statusIcon = selectedFileDiv.querySelector('.status-icon');
        
        fileNameSpan.textContent = file.name;
        statusIcon.style.display = 'none';
        statusIcon.classList.remove('success', 'error');
        statusIcon.title = ''; // Clear any existing tooltip
        
        selectedFileDiv.style.display = 'flex';
        
        currentFile = file;
        document.getElementById('pinDialog').style.display = 'block';
    }

    decryptButton.addEventListener('click', async () => {
        if (!currentFile || !pinInput.value) return;

        const formData = new FormData();
        formData.append('file', currentFile);
        formData.append('pin', pinInput.value);

        const statusIcon = document.querySelector('#selectedFile .status-icon');
        
        try {
            const response = await fetch('/api/v1/config/decrypt', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Decryption failed');
            }

            const config = await response.json();
            
            // Show success icon with tooltip
            statusIcon.textContent = 'check_circle';
            statusIcon.classList.remove('error');
            statusIcon.classList.add('success');
            statusIcon.style.display = 'block';
            statusIcon.title = 'Configuration successfully loaded';

            // Fill form with decrypted data and update MDL
            const fields = {
                'workspace_name': config.workspace_name,
                'workspace_key': config.workspace_key,
                'subscription_key': config.subscription_key,
                'uploader_name': config.uploader_name
            };

            // Update each field and its MDL container
            Object.entries(fields).forEach(([id, value]) => {
                const input = document.getElementById(id);
                const container = input.parentElement;
                input.value = value;
                container.classList.add('is-dirty');  // MDL class for filled inputs
                container.classList.remove('is-invalid');  // Remove invalid state
                container.MaterialTextfield.checkDirty();  // MDL method to update visual state
                container.MaterialTextfield.checkValidity();  // MDL method to update validation state
            });
            
            // Hide PIN dialog and reset
            document.getElementById('pinDialog').style.display = 'none';
            pinInput.value = '';

            // Update form validity state
            checkFormValidity();
            
            // Force MDL to update all components
            componentHandler.upgradeDom();

        } catch (error) {
            console.error('Error:', error);
            // Show error icon with tooltip
            statusIcon.textContent = 'error';
            statusIcon.classList.remove('success');
            statusIcon.classList.add('error');
            statusIcon.style.display = 'block';
            statusIcon.title = 'Wrong PIN. Try again or check if you have the correct configuration file';
            
            // Clear PIN input for retry
            pinInput.value = '';
            pinInput.focus();
        }
    });

    // Add tooltips to elements
    if (dropZone) {
        dropZone.title = 'Drop your .mydre configuration file here or click to select';
    }
    if (fileInput) {
        fileInput.title = 'Select a .mydre configuration file';
    }
    if (pinInput) {
        pinInput.title = 'Enter the PIN used to encrypt this configuration file';
    }
    if (decryptButton) {
        decryptButton.title = 'Click to decrypt the configuration file with the entered PIN';
    }
});
