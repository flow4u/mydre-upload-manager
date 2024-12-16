// Only run this code if we're on the upload page
if (document.getElementById('upload-form')) {
    class UploadFileHandler {
        constructor(dropZone, fileInput, filesList) {
            this.dropZone = dropZone;
            this.fileInput = fileInput;
            this.filesList = filesList;
            this.uploadedFiles = new Map();
            
            this.initializeDropZone();
            this.initializeFileInput();
            this.initializePinDialog();
        }

        initializeDropZone() {
            // Handle drag and drop
            this.dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                this.dropZone.classList.add('dragover');
            });

            this.dropZone.addEventListener('dragleave', () => {
                this.dropZone.classList.remove('dragover');
            });

            this.dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                this.dropZone.classList.remove('dragover');
                
                if (e.dataTransfer.files.length > 0) {
                    this.handleFiles(Array.from(e.dataTransfer.files));
                }
            });

            // Handle click to select files
            this.dropZone.addEventListener('click', () => {
                this.fileInput.click();
            });
        }

        initializeFileInput() {
            this.fileInput.addEventListener('change', (e) => {
                this.handleFiles(Array.from(e.target.files));
                this.fileInput.value = ''; // Reset input
            });
        }

        initializePinDialog() {
            // Create dialog if it doesn't exist
            if (!document.getElementById('pinDialog')) {
                const dialogHTML = `
                    <dialog class="mdl-dialog" id="pinDialog">
                        <h4 class="mdl-dialog__title">Enter PIN</h4>
                        <div class="mdl-dialog__content">
                            <p>Enter PIN for file: <span id="currentFileName"></span></p>
                            <div class="mdl-textfield mdl-js-textfield mdl-textfield--floating-label">
                                <input class="mdl-textfield__input" type="password" id="filePin" pattern=".{6,}">
                                <label class="mdl-textfield__label" for="filePin">PIN (minimum 6 characters)</label>
                            </div>
                        </div>
                        <div class="mdl-dialog__actions">
                            <button type="button" class="mdl-button" id="decryptButton">Decrypt</button>
                            <button type="button" class="mdl-button close" id="cancelButton">Cancel</button>
                        </div>
                    </dialog>
                `;
                document.body.insertAdjacentHTML('beforeend', dialogHTML);
            }

            this.pinDialog = document.getElementById('pinDialog');
            if (typeof this.pinDialog.showModal !== 'function') {
                dialogPolyfill.registerDialog(this.pinDialog);
            }

            this.setupPinDialog();
        }

        setupPinDialog() {
            const decryptButton = document.getElementById('decryptButton');
            const cancelButton = document.getElementById('cancelButton');
            const pinInput = document.getElementById('filePin');

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
                    this.pinDialog.close();
                    pinInput.value = '';
                }
            });

            cancelButton.addEventListener('click', () => {
                this.pinDialog.close();
                pinInput.value = '';
            });
        }

        handleFiles(files) {
            files.forEach(file => {
                if (file.name.endsWith('.mydre')) {
                    this.addFileToList(file);
                    // Show PIN dialog for each file
                    document.getElementById('currentFileName').textContent = file.name;
                    this.pinDialog.showModal();
                } else {
                    console.warn(`Skipping file ${file.name}: not a .mydre file`);
                }
            });
        }

        addFileToList(file) {
            if (this.uploadedFiles.has(file.name)) {
                console.warn(`File ${file.name} already added`);
                return;
            }

            const fileDiv = document.createElement('div');
            fileDiv.className = 'file-item mdl-shadow--2dp';
            
            const fileIcon = document.createElement('i');
            fileIcon.className = 'material-icons';
            fileIcon.textContent = 'description';
            
            const fileName = document.createElement('span');
            fileName.className = 'file-name';
            fileName.textContent = file.name;
            
            const statusIcon = document.createElement('i');
            statusIcon.className = 'material-icons status-icon pending';
            statusIcon.textContent = 'hourglass_empty';
            statusIcon.title = 'Click to decrypt file';
            statusIcon.style.cursor = 'pointer';
            statusIcon.addEventListener('click', () => {
                document.getElementById('currentFileName').textContent = file.name;
                this.pinDialog.showModal();
            });
            
            const removeButton = document.createElement('button');
            removeButton.className = 'mdl-button mdl-js-button mdl-button--icon';
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
        }

        async handleDecryption(fileName, pin) {
            const fileData = this.uploadedFiles.get(fileName);
            if (!fileData) {
                console.error('File not found:', fileName);
                return;
            }

            try {
                console.log('Starting decryption for:', fileName);
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
                
                // Process the decrypted data and show workspaces
                this.processDecryptedData(fileName, result);
                this.updateFileStatus(fileName, true);

            } catch (error) {
                console.error('Decryption error:', error);
                this.updateFileStatus(fileName, false);
                alert(`Decryption failed: ${error.message}`);
            }
        }

        processDecryptedData(fileName, data) {
            console.log('Processing decrypted data:', data);
            
            // Create workspaces grid if it doesn't exist
            let workspacesGrid = document.getElementById('workspacesGrid');
            if (!workspacesGrid) {
                workspacesGrid = document.createElement('div');
                workspacesGrid.id = 'workspacesGrid';
                workspacesGrid.className = 'workspaces-grid';
                
                // Add header
                const header = document.createElement('h3');
                header.textContent = 'Workspaces to Upload to';
                workspacesGrid.appendChild(header);
                
                // Add grid header
                const gridHeader = document.createElement('div');
                gridHeader.className = 'mdl-grid grid-header';
                gridHeader.innerHTML = `
                    <div class="mdl-cell mdl-cell--5-col">Workspace Name</div>
                    <div class="mdl-cell mdl-cell--5-col">Uploader Name</div>
                    <div class="mdl-cell mdl-cell--2-col">Actions</div>
                `;
                workspacesGrid.appendChild(gridHeader);
                
                // Add workspaces list container
                const workspacesList = document.createElement('div');
                workspacesList.id = 'workspacesList';
                workspacesGrid.appendChild(workspacesList);

                // Create file upload section elements separately
                const uploadSection = document.createElement('div');
                uploadSection.className = 'file-upload-section';
                
                const title = document.createElement('h3');
                title.textContent = 'Files to Upload';
                uploadSection.appendChild(title);

                const dropZone = document.createElement('div');
                dropZone.className = 'file-upload-area';
                dropZone.id = 'dataDropZone';
                
                const icon = document.createElement('i');
                icon.className = 'material-icons';
                icon.textContent = 'cloud_upload';
                dropZone.appendChild(icon);
                
                const text = document.createElement('p');
                text.textContent = 'Drag & drop files here or click to select files';
                dropZone.appendChild(text);
                
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.id = 'dataFileInput';
                fileInput.multiple = true;
                fileInput.style.display = 'none';
                dropZone.appendChild(fileInput);
                
                uploadSection.appendChild(dropZone);
                
                const filesList = document.createElement('div');
                filesList.id = 'dataFilesList';
                filesList.className = 'files-list';
                uploadSection.appendChild(filesList);
                
                workspacesGrid.appendChild(uploadSection);
                
                // Add to page after files list
                this.filesList.parentNode.insertBefore(workspacesGrid, this.filesList.nextSibling);

                // Initialize the data upload functionality
                this.initializeDataUpload();
            }

            const workspacesList = document.getElementById('workspacesList');
            
            // Handle both single workspace and multiple workspaces format
            let workspaces = data.workspaces || { [data.workspace_name || 'Workspace']: {
                workspace_key: data.workspace_key,
                subscription_key: data.subscription_key,
                uploader_name: data.uploader_name
            }};

            // Add each workspace to the grid
            Object.entries(workspaces).forEach(([workspaceName, workspaceData]) => {
                this.addWorkspaceToGrid(workspaceName, workspaceData);
            });

            // Show the grid
            workspacesGrid.style.display = 'block';
        }

        addWorkspaceToGrid(workspaceName, workspaceData) {
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
                // Check if there are any workspaces left
                if (!workspacesList.children.length) {
                    document.getElementById('workspacesGrid').style.display = 'none';
                }
            };
            actionCell.appendChild(removeButton);
            
            // Add cells to row
            row.appendChild(nameCell);
            row.appendChild(uploaderCell);
            row.appendChild(actionCell);
            
            // Add row to grid
            workspacesList.appendChild(row);
        }

        async uploadFile(file, decryptedData) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('config', JSON.stringify(decryptedData));

            const response = await fetch('/api/v1/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            return await response.json();
        }

        removeFile(fileName) {
            const fileData = this.uploadedFiles.get(fileName);
            if (fileData) {
                fileData.element.remove();
                this.uploadedFiles.delete(fileName);
            }
        }

        updateFileStatus(fileName, success) {
            const fileData = this.uploadedFiles.get(fileName);
            if (fileData) {
                const statusIcon = fileData.element.querySelector('.status-icon');
                statusIcon.textContent = success ? 'check_circle' : 'error';
                statusIcon.className = `material-icons status-icon ${success ? 'success' : 'error'}`;
                statusIcon.title = success ? 'Successfully uploaded' : 'Upload failed';
                statusIcon.style.display = 'block';
            }
        }

        initializeDataUpload() {
            const dataDropZone = document.getElementById('dataDropZone');
            const dataFileInput = document.getElementById('dataFileInput');
            const dataFilesList = document.getElementById('dataFilesList');

            // Handle file input change with explicit multiple files handling
            dataFileInput.addEventListener('change', (e) => {
                console.log('Files selected:', e.target.files.length);
                this.handleDataFiles(Array.from(e.target.files));
                dataFileInput.value = ''; // Reset input
            });

            // Handle drop zone click
            dataDropZone.addEventListener('click', () => {
                dataFileInput.click();
            });

            // Handle drag and drop
            dataDropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dataDropZone.classList.add('dragover');
            });

            dataDropZone.addEventListener('dragleave', () => {
                dataDropZone.classList.remove('dragover');
            });

            dataDropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dataDropZone.classList.remove('dragover');
                
                if (e.dataTransfer.files.length > 0) {
                    this.handleDataFiles(Array.from(e.dataTransfer.files));
                }
            });
        }

        handleDataFiles(files) {
            files.forEach(file => {
                this.addDataFileToList(file);
            });
        }

        addDataFileToList(file) {
            const dataFilesList = document.getElementById('dataFilesList');
            
            const fileDiv = document.createElement('div');
            fileDiv.className = 'file-item mdl-shadow--2dp';
            
            const fileIcon = document.createElement('i');
            fileIcon.className = 'material-icons';
            fileIcon.textContent = 'description';
            
            const fileName = document.createElement('span');
            fileName.className = 'file-name';
            fileName.textContent = file.name;
            
            // Status icon is just for upload status, not decryption
            const statusIcon = document.createElement('i');
            statusIcon.className = 'material-icons status-icon';
            statusIcon.style.display = 'none'; // Hide initially, show after upload attempt
            
            const removeButton = document.createElement('button');
            removeButton.className = 'mdl-button mdl-js-button mdl-button--icon';
            removeButton.innerHTML = '<i class="material-icons">close</i>';
            removeButton.addEventListener('click', () => fileDiv.remove());
            
            fileDiv.appendChild(fileIcon);
            fileDiv.appendChild(fileName);
            fileDiv.appendChild(statusIcon);
            fileDiv.appendChild(removeButton);
            
            dataFilesList.appendChild(fileDiv);
        }
    }

    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        const filesList = document.getElementById('filesList');
        
        if (dropZone && fileInput && filesList) {
            new UploadFileHandler(dropZone, fileInput, filesList);
        }
    });
} 