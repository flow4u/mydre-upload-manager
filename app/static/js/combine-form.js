// Namespace for combine configurations
const CombineConfig = {
    dropZone: null,
    fileInput: null,
    filesList: null,
    pinDialog: null,
    uploadedFiles: new Map(),

    init() {
        console.log('Checking for combine-config page');
        const combineConfigPage = document.querySelector('.combine-config');
        
        if (!combineConfigPage) {
            console.log('Not on combine-config page');
            return;
        }

        console.log('Found combine-config page, initializing elements');
        this.dropZone = document.getElementById('combineDropZone');
        this.fileInput = document.getElementById('combineFileInput');
        this.filesList = document.getElementById('combineFilesList');
        this.pinDialog = document.getElementById('pinDialog');

        if (!this.dropZone || !this.fileInput || !this.filesList || !this.pinDialog) {
            console.error('Required combine config elements not found');
            return;
        }

        this.setupDragAndDrop();
        this.setupFileInput();
        this.setupPinDialog();
        this.setupCombineForm();
        
        // Initialize MDL components
        componentHandler.upgradeDom();
    },

    setupDragAndDrop() {
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.dropZone.addEventListener(eventName, this.preventDefaults, false);
        });

        // Handle drag states
        this.dropZone.addEventListener('dragenter', this.handleDragEnter.bind(this), false);
        this.dropZone.addEventListener('dragover', this.handleDragOver.bind(this), false);
        this.dropZone.addEventListener('dragleave', this.handleDragLeave.bind(this), false);
        this.dropZone.addEventListener('drop', this.handleDrop.bind(this), false);

        // Handle click to select files - removed preventDefault
        this.dropZone.addEventListener('click', () => {
            console.log('Drop zone clicked');
            this.fileInput.click();
        });
    },

    setupFileInput() {
        this.fileInput.addEventListener('change', (e) => {
            console.log('File input change event');
            const files = Array.from(e.target.files);
            this.handleFiles(files);
            this.fileInput.value = ''; // Reset input
        });
    },

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    },

    handleDragEnter(e) {
        this.preventDefaults(e);
        this.dropZone.classList.add('drag-over');
    },

    handleDragOver(e) {
        this.preventDefaults(e);
        this.dropZone.classList.add('drag-over');
    },

    handleDragLeave(e) {
        this.preventDefaults(e);
        this.dropZone.classList.remove('drag-over');
    },

    handleDrop(e) {
        this.preventDefaults(e);
        this.dropZone.classList.remove('drag-over');
        const files = Array.from(e.dataTransfer.files);
        this.handleFiles(files);
    },

    handleFiles(files) {
        console.log('Processing files:', files.length);
        files.forEach(file => {
            if (file.name.endsWith('.mydre')) {
                this.addFileToList(file);
            } else {
                console.warn(`Skipping file ${file.name}: not a .mydre file`);
            }
        });
    },

    addFileToList(file) {
        if (this.uploadedFiles.has(file.name)) {
            console.warn(`File ${file.name} already added`);
            return;
        }

        const fileDiv = document.createElement('div');
        fileDiv.className = 'file-item mdl-shadow--2dp';
        
        const fileIcon = document.createElement('i');
        fileIcon.className = 'material-icons file-icon';
        fileIcon.textContent = 'description';
        
        const fileName = document.createElement('span');
        fileName.className = 'file-name';
        fileName.textContent = file.name;
        
        const statusIcon = document.createElement('i');
        statusIcon.className = 'material-icons status-icon pending';
        statusIcon.textContent = 'hourglass_empty';
        statusIcon.title = 'Click to decrypt file';
        statusIcon.addEventListener('click', () => this.handleStatusClick(file.name));
        
        const removeButton = document.createElement('button');
        removeButton.className = 'mdl-button mdl-js-button mdl-button--icon remove-button';
        removeButton.innerHTML = '<i class="material-icons">close</i>';
        removeButton.addEventListener('click', () => this.removeFile(file.name));
        
        fileDiv.appendChild(fileIcon);
        fileDiv.appendChild(fileName);
        fileDiv.appendChild(statusIcon);
        fileDiv.appendChild(removeButton);
        
        this.filesList.appendChild(fileDiv);
        this.uploadedFiles.set(file.name, { 
            file, 
            element: fileDiv,
            status: 'pending'
        });
    },

    handleStatusClick(fileName) {
        const fileData = this.uploadedFiles.get(fileName);
        if (fileData && (fileData.status === 'pending' || fileData.status === 'error')) {
            this.showPinDialog(fileName);
        }
    },

    removeFile(fileName) {
        const fileData = this.uploadedFiles.get(fileName);
        if (fileData) {
            fileData.element.remove();
            this.uploadedFiles.delete(fileName);
        }
    },

    showPinDialog(fileName) {
        document.getElementById('currentFileName').textContent = fileName;
        document.getElementById('filePin').value = '';
        this.pinDialog.showModal();
    },

    setupPinDialog() {
        const decryptButton = document.getElementById('decryptButton');
        const cancelButton = document.getElementById('cancelButton');
        const pinInput = document.getElementById('filePin');

        decryptButton.addEventListener('click', async () => {
            const fileName = document.getElementById('currentFileName').textContent;
            const pin = pinInput.value;
            
            if (!pin) {
                console.error('PIN is required');
                return;
            }

            const fileData = this.uploadedFiles.get(fileName);
            if (!fileData) {
                console.error('File not found:', fileName);
                return;
            }

            try {
                console.log('Preparing decrypt request...'); // Debug log
                const formData = new FormData();
                formData.append('file', fileData.file);
                formData.append('pin', pin);

                console.log('Sending decrypt request...'); // Debug log
                const response = await fetch('/api/v1/config/decrypt', {  // Changed to /config/decrypt to match existing endpoint
                    method: 'POST',
                    body: formData
                });

                console.log('Response status:', response.status); // Debug log

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `Decryption failed: ${response.statusText}`);
                }

                const result = await response.json();
                console.log('Decrypt result:', result); // Debug log

                // Check if we got workspace data back (successful decryption)
                if (result.workspace_name) {
                    this.updateFileStatus(fileName, true);
                    console.log('File decrypted successfully:', fileName);
                    // Store the decrypted data and update grid
                    fileData.decryptedData = result;
                    this.updateWorkspacesGrid();
                } else {
                    throw new Error('Invalid decryption response');
                }
            } catch (error) {
                console.error('Decryption error:', error);
                this.updateFileStatus(fileName, false);
            } finally {
                this.pinDialog.close();
                pinInput.value = '';
            }
        });

        cancelButton.addEventListener('click', () => {
            this.pinDialog.close();
            pinInput.value = '';
        });
    },

    updateFileStatus(fileName, success) {
        const fileData = this.uploadedFiles.get(fileName);
        if (fileData) {
            const statusIcon = fileData.element.querySelector('.status-icon');
            if (success) {
                statusIcon.textContent = 'check_circle';
                statusIcon.className = 'material-icons status-icon success';
                fileData.status = 'success';
            } else {
                statusIcon.textContent = 'error';
                statusIcon.className = 'material-icons status-icon error';
                fileData.status = 'error';
            }
        }
    },

    updateWorkspacesGrid() {
        const workspacesGrid = document.getElementById('workspacesGrid');
        const workspacesList = document.getElementById('workspacesList');
        
        // Show the grid if it was hidden
        workspacesGrid.style.display = 'block';
        
        // Create a new workspace row
        const row = document.createElement('div');
        row.className = 'mdl-grid workspace-row';
        
        // Add workspace data to the row
        const workspace = this.uploadedFiles.get(document.getElementById('currentFileName').textContent).decryptedData;
        
        // Create cells for workspace name and uploader name only
        const nameCell = document.createElement('div');
        nameCell.className = 'mdl-cell mdl-cell--5-col';
        nameCell.textContent = workspace.workspace_name;
        
        // Check for duplicate workspace names
        const existingWorkspaceNames = Array.from(workspacesList.children).map(
            row => row.querySelector('.mdl-cell').textContent
        );
        
        if (existingWorkspaceNames.includes(workspace.workspace_name)) {
            // Add red color to both the existing and new workspace names
            nameCell.style.color = '#F44336';  // Material Design red
            // Find and color the existing duplicate
            workspacesList.querySelectorAll('.mdl-cell').forEach(cell => {
                if (cell.textContent === workspace.workspace_name) {
                    cell.style.color = '#F44336';
                }
            });
        }
        
        const uploaderCell = document.createElement('div');
        uploaderCell.className = 'mdl-cell mdl-cell--5-col';
        uploaderCell.textContent = workspace.uploader_name;
        
        // Add remove button
        const actionCell = document.createElement('div');
        actionCell.className = 'mdl-cell mdl-cell--2-col';
        const removeButton = document.createElement('button');
        removeButton.className = 'mdl-button mdl-js-button mdl-button--icon';
        removeButton.innerHTML = '<i class="material-icons">delete</i>';
        removeButton.onclick = () => {
            row.remove();
            // Recheck for duplicates after removal
            this.recheckDuplicates();
        };
        actionCell.appendChild(removeButton);
        
        // Add cells to the row
        row.appendChild(nameCell);
        row.appendChild(uploaderCell);
        row.appendChild(actionCell);
        
        // Add the row to the grid
        workspacesList.appendChild(row);
        
        // Update combine form visibility
        this.updateCombineFormVisibility();
    },

    recheckDuplicates() {
        const workspacesList = document.getElementById('workspacesList');
        const rows = Array.from(workspacesList.children);
        const nameMap = new Map();

        // Reset all colors first
        rows.forEach(row => {
            const nameCell = row.querySelector('.mdl-cell');
            nameCell.style.color = '';
        });

        // Check for duplicates and color them
        rows.forEach(row => {
            const nameCell = row.querySelector('.mdl-cell');
            const name = nameCell.textContent;
            
            if (nameMap.has(name)) {
                // Color both this one and the previous one
                nameCell.style.color = '#F44336';
                nameMap.get(name).style.color = '#F44336';
            } else {
                nameMap.set(name, nameCell);
            }
        });
    },

    setupCombineForm() {
        console.log('Setting up combine form');
        const combineForm = document.getElementById('combineForm');
        const combineButton = document.getElementById('combineButton');
        const pinInput = document.getElementById('combinePin');
        const fileNameInput = document.getElementById('combineFileName');

        if (!combineButton || !pinInput || !fileNameInput) {
            console.error('Combine form elements not found');
            return;
        }

        this.updateCombineFormVisibility();

        combineButton.addEventListener('click', async () => {
            console.log('Combine button clicked');
            const pin = pinInput.value;
            let fileName = fileNameInput.value;

            if (pin.length < 6) {
                alert('PIN must be at least 6 characters long');
                return;
            }

            if (!fileName.endsWith('.mydre')) {
                fileName += '.mydre';
                fileNameInput.value = fileName;
            }

            if (this.hasDuplicateWorkspaces()) {
                alert('Cannot combine while duplicate workspace names exist');
                return;
            }

            try {
                console.log('Creating combined workspace data');
                const workspaces = {};
                const workspacesList = document.getElementById('workspacesList');
                
                Array.from(workspacesList.children).forEach(row => {
                    const cells = row.querySelectorAll('.mdl-cell');
                    const workspaceName = cells[0].textContent;
                    const originalData = this.findWorkspaceData(workspaceName);
                    
                    if (originalData) {
                        workspaces[workspaceName] = {
                            workspace_key: originalData.workspace_key,
                            subscription_key: originalData.subscription_key,
                            uploader_name: originalData.uploader_name
                        };
                    }
                });

                const combinedData = {
                    workspaces: workspaces
                };

                // Create a Blob from the JSON data
                const jsonBlob = new Blob([JSON.stringify(combinedData)], { type: 'application/json' });
                
                // Create FormData and append the file and pin
                const formData = new FormData();
                formData.append('file', jsonBlob, fileName);
                formData.append('pin', pin);

                console.log('Sending data for encryption');
                // Use the same endpoint as config-form.js
                const response = await fetch('/encrypt', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error('Failed to encrypt combined file');
                }

                // Handle the encrypted file download
                const blob = await response.blob();
                const downloadUrl = window.URL.createObjectURL(blob);
                const downloadLink = document.createElement('a');
                downloadLink.href = downloadUrl;
                downloadLink.download = fileName;
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
                window.URL.revokeObjectURL(downloadUrl);

            } catch (error) {
                console.error('Error combining workspaces:', error);
                alert('Failed to create combined file');
            }
        });
    },

    hasDuplicateWorkspaces() {
        const workspacesList = document.getElementById('workspacesList');
        const names = new Set();
        let hasDuplicates = false;

        Array.from(workspacesList.children).forEach(row => {
            const name = row.querySelector('.mdl-cell').textContent;
            if (names.has(name)) {
                hasDuplicates = true;
            }
            names.add(name);
        });

        return hasDuplicates;
    },

    findWorkspaceData(workspaceName) {
        // Search through all uploaded files for matching workspace data
        for (const fileData of this.uploadedFiles.values()) {
            if (fileData.decryptedData && fileData.decryptedData.workspace_name === workspaceName) {
                return fileData.decryptedData;
            }
        }
        return null;
    },

    updateCombineFormVisibility() {
        const combineForm = document.getElementById('combineForm');
        const workspacesList = document.getElementById('workspacesList');
        
        if (workspacesList.children.length > 0) {
            combineForm.style.display = 'block';
        } else {
            combineForm.style.display = 'none';
        }
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing CombineConfig');
    CombineConfig.init();
}); 