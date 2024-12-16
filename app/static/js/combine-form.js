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
        // Prevent default drag behaviors on document level
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            document.addEventListener(eventName, this.preventDefaults, false);
            this.dropZone.addEventListener(eventName, this.preventDefaults, false);
        });

        // Add drag-over class for visual feedback
        this.dropZone.addEventListener('dragenter', (e) => {
            this.preventDefaults(e);
            this.dropZone.classList.add('file-upload-area--active');
        });

        this.dropZone.addEventListener('dragover', (e) => {
            this.preventDefaults(e);
            this.dropZone.classList.add('file-upload-area--active');
        });

        this.dropZone.addEventListener('dragleave', (e) => {
            this.preventDefaults(e);
            this.dropZone.classList.remove('file-upload-area--active');
        });

        this.dropZone.addEventListener('drop', (e) => {
            this.preventDefaults(e);
            this.dropZone.classList.remove('file-upload-area--active');
            const files = Array.from(e.dataTransfer.files);
            this.handleFiles(files);
        });

        // Handle click to select files
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
                // If PIN is 000000, read file directly without decryption
                if (pin === '000000') {
                    console.log('Test PIN detected, reading file without decryption');
                    const reader = new FileReader();
                    
                    reader.onload = (e) => {
                        try {
                            const content = e.target.result;
                            console.log('Raw file content:', content);
                            
                            const jsonData = JSON.parse(content);
                            console.log('Parsed JSON data:', jsonData);
                            
                            if (!this.validateDecryptedStructure(jsonData)) {
                                throw new Error('Invalid workspace structure');
                            }
                            
                            this.processDecryptedData(fileName, fileData, jsonData);
                        } catch (error) {
                            console.error('Error processing file:', error);
                            this.updateFileStatus(fileName, false);
                        }
                    };
                    
                    reader.readAsText(fileData.file);
                    this.pinDialog.close();
                    pinInput.value = '';
                    return;
                }

                // Normal decryption process
                console.log('=== Starting Decryption Process ===');
                const formData = new FormData();
                formData.append('file', fileData.file);
                formData.append('pin', pin);

                console.log('Sending decrypt request...');
                const response = await fetch('/api/v1/config/decrypt', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `Decryption failed: ${response.statusText}`);
                }

                let result = await response.json();
                console.log('Raw decrypt result:', result);

                // Convert single workspace format to workspaces format if needed
                if (!result.workspaces && result.workspace_key) {
                    console.log('Converting single workspace format to workspaces format');
                    result = {
                        workspaces: {
                            [result.workspace_name || 'Workspace']: {
                                workspace_key: result.workspace_key,
                                subscription_key: result.subscription_key,
                                uploader_name: result.uploader_name
                            }
                        }
                    };
                }

                console.log('Processed decrypt result:', result);

                if (!this.validateDecryptedStructure(result)) {
                    throw new Error('Invalid decrypted data structure');
                }

                this.processDecryptedData(fileName, fileData, result);

            } catch (error) {
                console.error('Decryption error:', error);
                this.updateFileStatus(fileName, false);
                alert(`Decryption failed: ${error.message}`);
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

    validateDecryptedStructure(data) {
        console.log('Validating decrypted structure...', data);
        
        if (!data || typeof data !== 'object') {
            console.error('Invalid data type');
            return false;
        }

        // Handle both single workspace and multiple workspaces format
        if (data.workspace_key && data.subscription_key && data.uploader_name) {
            console.log('Valid single workspace structure found');
            return true;
        }

        if (!data.workspaces || typeof data.workspaces !== 'object') {
            console.error('Missing or invalid workspaces object');
            return false;
        }

        const workspaceCount = Object.keys(data.workspaces).length;
        console.log('Number of workspaces found:', workspaceCount);

        if (workspaceCount === 0) {
            console.error('No workspaces found in decrypted data');
            return false;
        }

        // Validate each workspace
        for (const [name, workspace] of Object.entries(data.workspaces)) {
            console.log(`Validating workspace: ${name}`);
            if (!workspace.workspace_key || 
                !workspace.subscription_key || 
                !workspace.uploader_name) {
                console.error(`Invalid workspace data for ${name}:`, workspace);
                return false;
            }
        }

        console.log('Decrypted structure validation passed');
        return true;
    },

    processDecryptedData(fileName, fileData, decryptedData) {
        console.log('=== Processing Decrypted Data ===');
        console.log('File:', fileName);
        console.log('Number of workspaces:', Object.keys(decryptedData.workspaces).length);
        
        // Store the decrypted data
        fileData.decryptedData = decryptedData;
        this.updateFileStatus(fileName, true);
        
        // Show the workspaces grid
        const workspacesGrid = document.getElementById('workspacesGrid');
        workspacesGrid.style.display = 'block';
        
        // Add each workspace to grid
        Object.entries(decryptedData.workspaces).forEach(([workspaceName, workspaceData]) => {
            console.log(`Adding workspace to grid: ${workspaceName}`);
            console.log('Workspace data:', workspaceData);
            
            this.addWorkspaceToGrid(workspaceName, {
                workspace_key: workspaceData.workspace_key,
                subscription_key: workspaceData.subscription_key,
                uploader_name: workspaceData.uploader_name
            });
        });
        
        console.log('All workspaces added to grid');
        this.updateCombineFormVisibility();
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

    addWorkspaceToGrid(workspaceName, workspaceData) {
        console.log(`Creating grid row for workspace: ${workspaceName}`, workspaceData);
        
        const workspacesList = document.getElementById('workspacesList');
        
        // Create row
        const row = document.createElement('div');
        row.className = 'mdl-grid workspace-row';
        
        // Workspace name cell
        const nameCell = document.createElement('div');
        nameCell.className = 'mdl-cell mdl-cell--5-col';
        nameCell.textContent = workspaceName;
        
        // Uploader name cell
        const uploaderCell = document.createElement('div');
        uploaderCell.className = 'mdl-cell mdl-cell--5-col';
        uploaderCell.textContent = workspaceData.uploader_name;
        
        // Action cell with remove button
        const actionCell = document.createElement('div');
        actionCell.className = 'mdl-cell mdl-cell--2-col';
        const removeButton = document.createElement('button');
        removeButton.className = 'mdl-button mdl-js-button mdl-button--icon';
        removeButton.innerHTML = '<i class="material-icons">delete</i>';
        removeButton.onclick = () => {
            row.remove();
            this.recheckDuplicates();
            this.updateCombineFormVisibility();
        };
        actionCell.appendChild(removeButton);
        
        // Add cells to row
        row.appendChild(nameCell);
        row.appendChild(uploaderCell);
        row.appendChild(actionCell);
        
        // Add row to grid
        workspacesList.appendChild(row);
        
        // Update visibility and check for duplicates
        this.updateCombineFormVisibility();
        this.recheckDuplicates();
        
        console.log(`Added workspace ${workspaceName} to grid`);
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
            console.log('=== Starting Combine Process ===');
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
                const workspaces = {};
                const workspacesList = document.getElementById('workspacesList');
                
                console.log('Collecting workspaces from grid...');
                console.log('Total workspaces found:', workspacesList.children.length);
                
                // Collect all workspace data
                Array.from(workspacesList.children).forEach((row, index) => {
                    const cells = row.querySelectorAll('.mdl-cell');
                    const workspaceName = cells[0].textContent;
                    const workspaceData = this.findWorkspaceData(workspaceName);
                    
                    console.log(`Processing workspace ${index + 1}:`, workspaceName);
                    
                    if (workspaceData) {
                        workspaces[workspaceName] = {
                            workspace_key: workspaceData.workspace_key,
                            subscription_key: workspaceData.subscription_key,
                            uploader_name: workspaceData.uploader_name
                        };
                        console.log(`Added workspace to combined data:`, {
                            name: workspaceName,
                            data: workspaces[workspaceName]
                        });
                    }
                });

                if (Object.keys(workspaces).length === 0) {
                    throw new Error('No workspaces found to combine');
                }

                // Create the combined data structure
                const combinedData = {
                    workspaces: workspaces
                };

                console.log('=== Final Combined Structure ===');
                console.log('Total workspaces:', Object.keys(workspaces).length);
                console.log('Workspace names:', Object.keys(workspaces));
                console.log('Complete structure:', JSON.stringify(combinedData, null, 2));

                // Verify structure before encryption
                if (!this.validateCombinedStructure(combinedData)) {
                    throw new Error('Invalid combined data structure');
                }

                // Create FormData for encryption
                const formData = new FormData();
                formData.append('pin', pin);
                formData.append('filename', fileName);
                formData.append('config', JSON.stringify(combinedData));

                console.log('Sending data for encryption...');
                console.log('Data being encrypted:', JSON.stringify(combinedData, null, 2));
                
                const response = await fetch('/api/v1/combine/encrypt', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(`Encryption failed: ${errorData.detail || response.statusText}`);
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

                console.log('Successfully encrypted and downloaded combined file');
                console.log('File contains', Object.keys(workspaces).length, 'workspaces');

            } catch (error) {
                console.error('Error in combine process:', error);
                alert(`Failed to create combined file: ${error.message}`);
            }
        });
    },

    validateCombinedStructure(data) {
        if (!data || typeof data !== 'object') {
            console.error('Invalid data type');
            return false;
        }

        if (!data.workspaces || typeof data.workspaces !== 'object') {
            console.error('Missing or invalid workspaces object');
            return false;
        }

        const workspaceCount = Object.keys(data.workspaces).length;
        if (workspaceCount === 0) {
            console.error('No workspaces found in structure');
            return false;
        }

        for (const [name, workspace] of Object.entries(data.workspaces)) {
            if (!workspace.workspace_key || 
                !workspace.subscription_key || 
                !workspace.uploader_name) {
                console.error(`Invalid workspace data for ${name}:`, workspace);
                return false;
            }
        }

        console.log('Combined structure validation passed');
        console.log('Total workspaces:', workspaceCount);
        return true;
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
            if (fileData.decryptedData && fileData.decryptedData.workspaces) {
                // If the file contains multiple workspaces
                if (fileData.decryptedData.workspaces[workspaceName]) {
                    return fileData.decryptedData.workspaces[workspaceName];
                }
            } else if (fileData.decryptedData && fileData.decryptedData.workspace_name === workspaceName) {
                // If it's a single workspace file
                return {
                    workspace_key: fileData.decryptedData.workspace_key,
                    subscription_key: fileData.decryptedData.subscription_key,
                    uploader_name: fileData.decryptedData.uploader_name
                };
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
    },

    handleFileUpload(file) {
        console.log('Handling file upload:', file.name);
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                // Try to parse the file content as JSON
                const content = e.target.result;
                try {
                    const jsonData = JSON.parse(content);
                    console.log('File appears to be unencrypted JSON:', file.name);
                    
                    // If it's valid JSON and has the expected structure, add it directly
                    if (jsonData.workspaces && typeof jsonData.workspaces === 'object') {
                        console.log('Valid workspaces structure found, adding directly');
                        this.uploadedFiles.set(file.name, {
                            file: file,
                            decryptedData: jsonData
                        });
                        this.updateFileStatus(file.name, true);
                        
                        // Add workspaces to grid
                        Object.entries(jsonData.workspaces).forEach(([workspaceName, workspaceData]) => {
                            this.addWorkspaceToGrid(workspaceName, workspaceData);
                        });
                        return;
                    }
                } catch (jsonError) {
                    // Not valid JSON, treat as encrypted
                    console.log('File appears to be encrypted:', file.name);
                }
                
                // If we get here, treat as encrypted file
                this.uploadedFiles.set(file.name, {
                    file: file
                });
                this.updateFileList();
                
                // Show PIN dialog for encrypted files
                document.getElementById('currentFileName').textContent = file.name;
                this.pinDialog.showModal();
                
            } catch (error) {
                console.error('Error processing file:', error);
                alert('Error processing file');
            }
        };
        
        reader.readAsText(file);
    },

    setupDropZone() {
        const dropZone = document.getElementById('combineDropZone');
        const fileInput = document.getElementById('combineFileInput');
        const filesList = document.getElementById('combineFilesList');

        // Handle file input change
        fileInput.addEventListener('change', (e) => {
            console.log('File input change event');
            if (e.target.files.length > 0) {
                this.handleFiles(Array.from(e.target.files));
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
                this.handleFiles(Array.from(e.dataTransfer.files));
            }
        });
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing CombineConfig');
    CombineConfig.init();
}); 