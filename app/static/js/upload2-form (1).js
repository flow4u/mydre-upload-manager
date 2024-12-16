class Upload2FileHandler {
    constructor() {
        this.keyFiles = new Map(); // {filename: {file: File, status: 'pending|success|error', data: null}}
        this.dataFilesDict = {};
        this.selectedFiles = new Set(); // Track selected files
        this.currentKeyFile = null; // Track which key file is being decrypted
        this.workspaces = new Map(); // Store workspace information
        this.selectedWorkspaces = new Set(); // Track selected workspaces
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    initialize() {
        // Initialize drag/drop zones
        const dataDropZone = document.getElementById('upload2-data-drop');
        const dataFileInput = document.getElementById('upload2-data-input');
        const keyDropZone = document.getElementById('upload2-key-drop');
        const keyFileInput = document.getElementById('upload2-key-input');

        if (dataDropZone && dataFileInput) {
            this.initializeDataDragDrop(dataDropZone, dataFileInput);
        }

        if (keyDropZone && keyFileInput) {
            this.initializeKeyDragDrop(keyDropZone, keyFileInput);
        }

        this.initializePinDialog();
        this.loadExistingFiles();
    }

    async loadExistingFiles() {
        try {
            const response = await fetch('/api/v1/upload2/files');
            const result = await response.json();
            
            if (result.status === 'success') {
                result.files.forEach(file => {
                    this.dataFilesDict[file.filename] = file.path;
                    this.selectedFiles.add(file.filename); // Pre-select all files
                });
                
                console.log('Loaded existing files:', this.dataFilesDict);
                this.updateDataFilesGrid();
            }
        } catch (error) {
            console.error('Failed to load existing files:', error);
        }
    }

    initializeDataDragDrop(dropZone, fileInput) {
        // Enable multiple file selection
        fileInput.setAttribute('multiple', 'true');
        
        // Click to select files
        dropZone.addEventListener('click', () => {
            fileInput.click();
        });

        // Drag and drop handlers
        dropZone.addEventListener('dragenter', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('dragover');
        });

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
                this.handleDataFiles(Array.from(files));
            }
        });

        // File input change handler
        fileInput.addEventListener('change', (e) => {
            const files = e.target.files;
            if (files.length > 0) {
                this.handleDataFiles(Array.from(files));
            }
        });
    }

    initializeKeyDragDrop(dropZone, fileInput) {
        fileInput.setAttribute('multiple', 'true');
        fileInput.setAttribute('accept', '.mydre');
        
        dropZone.addEventListener('click', () => fileInput.click());

        dropZone.addEventListener('dragenter', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('dragover');
        });

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
            
            const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.mydre'));
            this.handleKeyFiles(files);
        });

        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files).filter(f => f.name.endsWith('.mydre'));
            this.handleKeyFiles(files);
        });
    }

    handleKeyFiles(files) {
        files.forEach(file => {
            this.keyFiles.set(file.name, {
                file: file,
                status: 'pending',
                data: null
            });
        });
        this.updateKeyFilesGrid();
    }

    updateKeyFilesGrid() {
        const grid = document.getElementById('upload2-key-files-grid');
        grid.innerHTML = '';

        const headerRow = document.createElement('div');
        headerRow.className = 'grid-row header';
        headerRow.innerHTML = `
            <div class="grid-cell">Key File</div>
            <div class="grid-cell">Status</div>
            <div class="grid-cell">Actions</div>
        `;
        grid.appendChild(headerRow);

        this.keyFiles.forEach((fileInfo, fileName) => {
            const row = document.createElement('div');
            row.className = 'grid-row';
            
            const nameCell = document.createElement('div');
            nameCell.className = 'grid-cell';
            nameCell.textContent = fileName;
            
            const statusCell = document.createElement('div');
            statusCell.className = 'grid-cell';
            
            const statusIcon = document.createElement('i');
            statusIcon.className = 'material-icons status-icon';
            switch(fileInfo.status) {
                case 'pending':
                    statusIcon.textContent = 'hourglass_empty';
                    statusIcon.classList.add('pending-icon');
                    statusIcon.onclick = () => this.showPinDialog(fileName);
                    break;
                case 'success':
                    statusIcon.textContent = 'check_circle';
                    statusIcon.classList.add('success-icon');
                    break;
                case 'error':
                    statusIcon.textContent = 'error';
                    statusIcon.classList.add('error-icon');
                    statusIcon.onclick = () => this.showPinDialog(fileName);
                    break;
            }
            statusCell.appendChild(statusIcon);
            
            const actionCell = document.createElement('div');
            actionCell.className = 'grid-cell';
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'mdl-button mdl-js-button mdl-button--icon';
            deleteBtn.innerHTML = '<i class="material-icons">delete</i>';
            deleteBtn.onclick = () => this.removeKeyFile(fileName);
            
            actionCell.appendChild(deleteBtn);
            row.appendChild(nameCell);
            row.appendChild(statusCell);
            row.appendChild(actionCell);
            grid.appendChild(row);
        });
    }

    initializePinDialog() {
        const dialog = document.querySelector('#pinDialog');
        const pinInput = document.querySelector('#pinInput');
        const decryptButton = dialog.querySelector('.decrypt');
        const closeButton = dialog.querySelector('.close');

        // Close button handler
        closeButton.addEventListener('click', () => {
            dialog.close();
            pinInput.value = '';
            this.currentKeyFile = null;
        });

        // Decrypt button handler
        decryptButton.addEventListener('click', async () => {
            const pin = pinInput.value;
            if (this.currentKeyFile && pin) {
                await this.decryptKeyFile(this.currentKeyFile, pin);
                dialog.close();
                pinInput.value = '';
                this.currentKeyFile = null;
            }
        });

        // Handle Enter key in PIN input
        pinInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const pin = pinInput.value;
                if (this.currentKeyFile && pin) {
                    await this.decryptKeyFile(this.currentKeyFile, pin);
                    dialog.close();
                    pinInput.value = '';
                    this.currentKeyFile = null;
                }
            }
        });
    }

    showPinDialog(fileName) {
        const dialog = document.querySelector('#pinDialog');
        const pinInput = document.querySelector('#pinInput');
        this.currentKeyFile = fileName;
        pinInput.value = '';
        dialog.showModal();
        pinInput.focus();
    }

    async decryptKeyFile(fileName, pin) {
        const fileInfo = this.keyFiles.get(fileName);
        if (!fileInfo) return;

        try {
            const formData = new FormData();
            formData.append('file', fileInfo.file);
            formData.append('pin', pin);

            const response = await fetch('/api/v1/upload2/decrypt', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            console.log('Raw decryption result:', result);
            
            if (result.status === 'success' && result.data) {
                fileInfo.status = 'success';
                fileInfo.data = result.data;
                
                // Parse the JSON string if it's a string
                let workspacesData = typeof result.data === 'string' ? 
                    JSON.parse(result.data) : result.data;
                
                console.log('Parsed workspaces data:', workspacesData);

                if (workspacesData && workspacesData.workspaces) {
                    // Get workspace names
                    const workspaceNames = Object.keys(workspacesData.workspaces);
                    console.log('Found workspace names:', workspaceNames);

                    // Log each workspace name individually
                    workspaceNames.forEach(name => {
                        console.log('Workspace found:', name);
                        console.log('Workspace details:', workspacesData.workspaces[name]);
                    });

                    // Remove existing workspaces from this key file
                    for (const [id, workspace] of this.workspaces.entries()) {
                        if (workspace.fromKeyFile === fileName) {
                            this.workspaces.delete(id);
                        }
                    }

                    // Add each workspace
                    workspaceNames.forEach(workspaceName => {
                        const workspaceInfo = workspacesData.workspaces[workspaceName];
                        if (workspaceInfo) {
                            console.log(`Adding workspace to grid: ${workspaceName}`);

                            const workspaceId = `${workspaceName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                            this.workspaces.set(workspaceId, {
                                name: workspaceName,
                                key: workspaceInfo.workspace_key || '',
                                subscription: workspaceInfo.subscription_key || '',
                                uploader: workspaceInfo.uploader_name || '',
                                fromKeyFile: fileName
                            });
                        }
                    });

                    console.log('Final workspaces map:', this.workspaces);
                    this.updateWorkspaceGrid();
                } else {
                    console.warn('No valid workspaces data found:', workspacesData);
                    fileInfo.status = 'error';
                }
            } else {
                fileInfo.status = 'error';
                console.error(`Failed to decrypt ${fileName}:`, result.message || 'Invalid data structure');
            }
            
            this.updateKeyFilesGrid();
        } catch (error) {
            console.error('Decryption failed:', error);
            fileInfo.status = 'error';
            this.updateKeyFilesGrid();
        }
    }

    updateWorkspaceGrid() {
        const grid = document.getElementById('upload2-workspace-grid');
        if (!grid) {
            console.error('Workspace grid element not found!');
            return;
        }

        console.log('Updating workspace grid with:', this.workspaces);
        grid.innerHTML = '';

        // Create header row
        const headerRow = document.createElement('div');
        headerRow.className = 'grid-row header';
        headerRow.innerHTML = `
            <div class="grid-cell checkbox-cell">Select</div>
            <div class="grid-cell workspace-name">Workspace Name</div>
            <div class="grid-cell uploader-name">Uploader Name</div>
            <div class="grid-cell workspace-key" style="width: 1px; overflow: hidden;">Key</div>
            <div class="grid-cell subscription-key" style="width: 1px; overflow: hidden;">Subscription</div>
            <div class="grid-cell">Actions</div>
        `;
        grid.appendChild(headerRow);

        // Add workspace rows
        this.workspaces.forEach((workspace, id) => {
            console.log('Creating row for workspace:', workspace);
            
            const row = document.createElement('div');
            row.className = 'grid-row';
            
            // Create checkbox cell
            const checkboxCell = document.createElement('div');
            checkboxCell.className = 'grid-cell checkbox-cell';
            const checkbox = document.createElement('label');
            checkbox.className = 'mdl-checkbox mdl-js-checkbox mdl-js-ripple-effect';
            checkbox.innerHTML = `
                <input type="checkbox" class="mdl-checkbox__input" 
                       ${this.selectedWorkspaces.has(id) || true ? 'checked' : ''}>
            `;
            
            // Add checkbox event listener
            checkbox.querySelector('input').addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.selectedWorkspaces.add(id);
                } else {
                    this.selectedWorkspaces.delete(id);
                }
                console.log('Selected workspaces:', Array.from(this.selectedWorkspaces));
            });
            
            checkboxCell.appendChild(checkbox);
            
            // Create the rest of the row
            row.innerHTML = `
                <div class="grid-cell workspace-name">${workspace.name}</div>
                <div class="grid-cell uploader-name">${workspace.uploader}</div>
                <div class="grid-cell workspace-key" style="width: 1px; overflow: hidden;">${workspace.key}</div>
                <div class="grid-cell subscription-key" style="width: 1px; overflow: hidden;">${workspace.subscription}</div>
                <div class="grid-cell">
                    <button class="mdl-button mdl-js-button mdl-button--icon" onclick="window.upload2Handler.removeWorkspace('${id}')">
                        <i class="material-icons">delete</i>
                    </button>
                </div>
            `;
            
            // Insert checkbox at the beginning
            row.insertBefore(checkboxCell, row.firstChild);
            
            grid.appendChild(row);

            // Initialize MDL checkbox
            componentHandler.upgradeElement(checkbox);
            
            // Add to selected workspaces by default
            this.selectedWorkspaces.add(id);
        });
    }

    addWorkspace(workspaceName, workspaceInfo) {
        const workspaceId = `${workspaceName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.workspaces.set(workspaceId, {
            name: workspaceName,
            key: workspaceInfo.workspace_key,
            subscription: workspaceInfo.subscription_key,
            uploader: workspaceInfo.uploader_name
        });
        // Add to selected workspaces by default
        this.selectedWorkspaces.add(workspaceId);
        this.updateWorkspaceGrid();
    }

    removeWorkspace(workspaceId) {
        this.workspaces.delete(workspaceId);
        this.selectedWorkspaces.delete(workspaceId);
        this.updateWorkspaceGrid();
    }

    removeKeyFile(fileName) {
        this.keyFiles.delete(fileName);
        this.updateKeyFilesGrid();
    }

    async handleDataFiles(files) {
        try {
            const formData = new FormData();
            files.forEach(file => {
                formData.append('files', file);
                this.dataFilesDict[file.name] = file.name;
                this.selectedFiles.add(file.name); // Pre-select new files
            });

            const response = await fetch('/api/v1/upload2/files', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            console.log('Upload result:', result);

            if (result.status === 'success') {
                result.files.forEach(file => {
                    this.dataFilesDict[file.filename] = file.path;
                });
                this.updateDataFilesGrid();
            }

        } catch (error) {
            console.error('Upload failed:', error);
            alert('Upload failed: ' + error.message);
        }
    }

    updateDataFilesGrid() {
        const grid = document.getElementById('upload2-data-files-grid');
        grid.innerHTML = '';

        const headerRow = document.createElement('div');
        headerRow.className = 'grid-row header';
        headerRow.innerHTML = `
            <div class="grid-cell checkbox-cell">Select</div>
            <div class="grid-cell">File Name</div>
            <div class="grid-cell">Status</div>
            <div class="grid-cell">Actions</div>
        `;
        grid.appendChild(headerRow);

        Object.keys(this.dataFilesDict).forEach(fileName => {
            const row = document.createElement('div');
            row.className = 'grid-row';
            
            // Checkbox cell
            const checkboxCell = document.createElement('div');
            checkboxCell.className = 'grid-cell checkbox-cell';
            const checkbox = document.createElement('label');
            checkbox.className = 'mdl-checkbox mdl-js-checkbox mdl-js-ripple-effect';
            checkbox.innerHTML = `
                <input type="checkbox" class="mdl-checkbox__input" 
                       ${this.selectedFiles.has(fileName) ? 'checked' : ''}>
            `;
            checkbox.querySelector('input').addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.selectedFiles.add(fileName);
                } else {
                    this.selectedFiles.delete(fileName);
                }
                console.log('Selected files:', Array.from(this.selectedFiles));
            });
            checkboxCell.appendChild(checkbox);
            
            const nameCell = document.createElement('div');
            nameCell.className = 'grid-cell';
            nameCell.textContent = fileName;
            
            const statusCell = document.createElement('div');
            statusCell.className = 'grid-cell';
            statusCell.innerHTML = '<i class="material-icons success-icon">check_circle</i>';
            
            const actionCell = document.createElement('div');
            actionCell.className = 'grid-cell';
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'mdl-button mdl-js-button mdl-button--icon';
            deleteBtn.innerHTML = '<i class="material-icons">delete</i>';
            deleteBtn.onclick = () => this.removeDataFile(fileName);
            
            actionCell.appendChild(deleteBtn);
            row.appendChild(checkboxCell);
            row.appendChild(nameCell);
            row.appendChild(statusCell);
            row.appendChild(actionCell);
            grid.appendChild(row);

            // Initialize MDL checkbox
            componentHandler.upgradeElement(checkbox);
        });
    }

    async removeDataFile(fileName) {
        try {
            const response = await fetch(`/api/v1/upload2/files/${encodeURIComponent(fileName)}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                delete this.dataFilesDict[fileName];
                this.selectedFiles.delete(fileName); // Remove from selected files
                this.updateDataFilesGrid();
            } else {
                throw new Error('Failed to delete file');
            }
        } catch (error) {
            console.error('Delete failed:', error);
            alert('Failed to delete file: ' + error.message);
        }
    }
}

// Make handler available globally for the delete button
window.upload2Handler = new Upload2FileHandler();
