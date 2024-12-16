class CreateForm {
    constructor() {
        this.uploadedFiles = new Map();
        this.initializeDialog();
        this.setupDropZone();
        this.setupForm();
    }

    initializeDialog() {
        console.log('Initializing dialog...');
        // Remove any existing dialog
        const existingDialog = document.querySelector('#pinDialog');
        if (existingDialog) {
            existingDialog.remove();
        }

        // Create new dialog
        const dialogHTML = `
            <dialog id="pinDialog" class="mdl-dialog">
                <div class="mdl-dialog__content">
                    <h4>Enter PIN</h4>
                    <div class="mdl-textfield mdl-js-textfield mdl-textfield--floating-label">
                        <input class="mdl-textfield__input" type="password" id="filePin">
                        <label class="mdl-textfield__label" for="filePin">PIN</label>
                    </div>
                </div>
                <div class="mdl-dialog__actions">
                    <button type="button" id="decryptButton" class="mdl-button mdl-button--colored mdl-js-button">
                        Decrypt
                    </button>
                    <button type="button" id="cancelButton" class="mdl-button mdl-js-button">
                        Cancel
                    </button>
                </div>
            </dialog>
        `;
        document.body.insertAdjacentHTML('beforeend', dialogHTML);
        
        this.pinDialog = document.querySelector('#pinDialog');
        console.log('Dialog element created:', this.pinDialog);

        // Initialize dialog
        if (typeof HTMLDialogElement === 'function') {
            console.log('Native dialog support available');
        } else {
            console.log('Using dialog polyfill');
            dialogPolyfill.registerDialog(this.pinDialog);
        }

        // Setup dialog events immediately
        this.setupPinDialog();
    }

    setupDropZone() {
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        const selectedFile = document.getElementById('selectedFile');
        const currentFileName = document.createElement('span');
        currentFileName.id = 'currentFileName';
        selectedFile.appendChild(currentFileName);

        // Handle file input change
        fileInput.addEventListener('change', (e) => {
            console.log('File input change event');
            if (e.target.files.length > 0) {
                this.handleFileUpload(e.target.files[0]);
            }
        });

        // Handle drop zone click
        dropZone.addEventListener('click', () => {
            console.log('Drop zone clicked');
            fileInput.click();
        });

        // Handle drag and drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            
            if (e.dataTransfer.files.length > 0) {
                this.handleFileUpload(e.dataTransfer.files[0]);
            }
        });
    }

    handleFileUpload(file) {
        console.log('Processing file:', file.name);
        
        // Update UI to show selected file
        const selectedFile = document.getElementById('selectedFile');
        const currentFileName = document.getElementById('currentFileName');
        const fileNameSpan = selectedFile.querySelector('.file-name');
        
        if (!fileNameSpan) {
            const span = document.createElement('span');
            span.className = 'file-name';
            selectedFile.appendChild(span);
        }
        
        selectedFile.querySelector('.file-name').textContent = file.name;
        currentFileName.textContent = file.name;
        selectedFile.style.display = 'flex';
        
        // Store file data
        this.uploadedFiles.set(file.name, {
            file: file
        });
        
        // Show PIN dialog
        if (this.pinDialog) {
            try {
                if (typeof this.pinDialog.showModal === 'function') {
                    this.pinDialog.showModal();
                } else if (typeof this.pinDialog.show === 'function') {
                    this.pinDialog.show();
                } else {
                    throw new Error('Dialog methods not available');
                }
            } catch (error) {
                console.error('Error showing dialog:', error);
                alert('Could not show PIN dialog. Please make sure you have a modern browser.');
            }
        } else {
            console.error('PIN dialog not found');
        }
    }

    setupForm() {
        const form = document.getElementById('config-form');
        const submitButton = document.querySelector('button[type="submit"]');

        // Function to sanitize filename
        const createSafeFileName = (workspaceName, uploaderName) => {
            // Get the part before @ in uploader name if it exists
            const uploaderPart = uploaderName.split('@')[0];
            
            // Remove special characters and periods from both parts
            const sanitizedWorkspace = workspaceName //.replace(/[^a-zA-Z0-9-]/g, '');
            const sanitizedUploader = uploaderPart.replace(/[^a-zA-Z0-9-]/g, '');
            
            // Combine with hyphen and add extension
            return `${sanitizedWorkspace}-${sanitizedUploader}.mydre`;
        };

        // Function to check if all fields are valid
        const validateForm = () => {
            const workspace_name = document.getElementById('workspace_name').value;
            const workspace_key = document.getElementById('workspace_key').value;
            const subscription_key = document.getElementById('subscription_key').value;
            const uploader_name = document.getElementById('uploader_name').value;
            const pin = document.getElementById('pin').value;

            const isValid = workspace_name && 
                           workspace_key && 
                           subscription_key && 
                           uploader_name && 
                           pin.length >= 6;

            submitButton.disabled = !isValid;
            return isValid;
        };

        // Add input event listeners to all fields
        ['workspace_name', 'workspace_key', 'subscription_key', 'uploader_name', 'pin'].forEach(id => {
            const field = document.getElementById(id);
            if (field) {
                field.addEventListener('input', validateForm);
            }
        });

        // Initial validation
        validateForm();

        // Handle form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!validateForm()) return;

            // Disable button and change text while processing
            submitButton.disabled = true;
            submitButton.textContent = 'CREATING CONFIG...';

            try {
                const configData = {
                    workspace_name: document.getElementById('workspace_name').value,
                    workspace_key: document.getElementById('workspace_key').value,
                    subscription_key: document.getElementById('subscription_key').value,
                    uploader_name: document.getElementById('uploader_name').value,
                    pin: document.getElementById('pin').value
                };

                console.log('Sending config data:', configData);

                const response = await fetch('/api/v1/config/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(configData)
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || 'Failed to create config');
                }

                // Get the blob from response
                const blob = await response.blob();
                
                // Create download link with sanitized filename
                const downloadUrl = window.URL.createObjectURL(blob);
                const filename = createSafeFileName(
                    configData.workspace_name,
                    configData.uploader_name
                );
                
                console.log('Generated filename:', filename);
                
                // Create temporary link and trigger download
                const downloadLink = document.createElement('a');
                downloadLink.href = downloadUrl;
                downloadLink.download = filename;
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
                
                // Cleanup
                window.URL.revokeObjectURL(downloadUrl);
                
            } catch (error) {
                console.error('Error creating config:', error);
                alert(`Failed to create config: ${error.message}`);
            } finally {
                // Reset button state regardless of success or failure
                submitButton.disabled = false;
                submitButton.textContent = 'CREATE AND DOWNLOAD CONFIG';
            }
        });
    }

    setupPinDialog() {
        console.log('Setting up PIN dialog buttons');
        const decryptButton = document.querySelector('#decryptButton');
        const cancelButton = document.querySelector('#cancelButton');
        const pinInput = document.querySelector('#filePin');

        if (!decryptButton || !cancelButton || !pinInput) {
            console.error('Pin dialog elements not found:', {
                decryptButton: !!decryptButton,
                cancelButton: !!cancelButton,
                pinInput: !!pinInput
            });
            return;
        }

        console.log('Found all dialog elements');

        decryptButton.addEventListener('click', async () => {
            const fileName = document.getElementById('currentFileName').textContent;
            const pin = pinInput.value;
            
            if (!pin) {
                alert('PIN is required');
                return;
            }

            try {
                await this.handleDecryption(fileName, pin);
            } finally {
                if (this.pinDialog.open) {
                    this.pinDialog.close();
                }
                pinInput.value = '';
            }
        });

        cancelButton.addEventListener('click', () => {
            if (this.pinDialog.open) {
                this.pinDialog.close();
            }
            pinInput.value = '';
        });
    }

    async handleDecryption(fileName, pin) {
        const fileData = this.uploadedFiles.get(fileName);
        if (!fileData) {
            console.error('File not found:', fileName);
            return;
        }

        try {
            console.log('Preparing decrypt request...');
            const formData = new FormData();
            formData.append('file', fileData.file);
            formData.append('pin', pin);

            const response = await fetch('/api/v1/config/decrypt', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Decryption failed: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('Decryption result:', result);

            // Process the decrypted data
            this.processDecryptedData(result);
            this.updateFileStatus(fileName, true);

        } catch (error) {
            console.error('Decryption error:', error);
            this.updateFileStatus(fileName, false);
            alert(`Decryption failed: ${error.message}`);
        }
    }

    processDecryptedData(data) {
        console.log('Processing decrypted data:', data);
        
        let workspaceData;
        
        // Handle both single workspace and workspaces format
        if (data.workspaces) {
            const firstWorkspaceName = Object.keys(data.workspaces)[0];
            workspaceData = {
                workspace_name: firstWorkspaceName,
                ...data.workspaces[firstWorkspaceName]
            };
        } else {
            workspaceData = data;
        }

        console.log('Workspace data to populate form:', workspaceData);

        // Verify we have all required fields
        if (!workspaceData.workspace_key || 
            !workspaceData.subscription_key || 
            !workspaceData.uploader_name) {
            throw new Error('Missing required workspace data fields');
        }

        // Fill the form fields and update styling
        const fields = {
            'workspace_name': workspaceData.workspace_name || '',
            'workspace_key': workspaceData.workspace_key || '',
            'subscription_key': workspaceData.subscription_key || '',
            'uploader_name': workspaceData.uploader_name || ''
        };

        console.log('Setting form fields:', fields);

        // Update each form field and its container
        Object.entries(fields).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = value;
                // Add is-dirty class to parent container to show the field is populated
                const container = element.closest('.mdl-textfield');
                if (container) {
                    container.classList.add('is-dirty');
                    container.classList.add('is-focused');
                }
                console.log(`Set ${id} to:`, value);
            } else {
                console.error(`Form field not found: ${id}`);
            }
        });

        // Enable the form submit button if PIN field is also filled
        const pinField = document.getElementById('pin');
        const submitButton = document.querySelector('button[type="submit"]');
        if (submitButton) {
            // Enable button if PIN meets minimum length requirement
            if (pinField && pinField.value.length >= 6) {
                submitButton.disabled = false;
                console.log('Submit button enabled - all fields valid');
            } else {
                // Add event listener to PIN field to enable button when valid
                pinField.addEventListener('input', (e) => {
                    submitButton.disabled = e.target.value.length < 6;
                });
                console.log('Submit button will enable when PIN is valid');
            }
        }
    }

    updateFileStatus(fileName, success) {
        const fileElement = document.getElementById('selectedFile');
        if (!fileElement) {
            console.error('Selected file element not found');
            return;
        }
        const statusIcon = fileElement.querySelector('.status-icon');
        if (!statusIcon) {
            console.error('Status icon not found');
            return;
        }
        
        statusIcon.textContent = success ? 'check_circle' : 'error';
        statusIcon.style.color = success ? 'green' : 'red';
        statusIcon.style.display = 'inline';
        console.log(`Updated file status: ${success ? 'success' : 'error'}`);
    }

    // ... rest of the class implementation ...
}

// Initialize the form
document.addEventListener('DOMContentLoaded', () => {
    new CreateForm();
}); 