document.addEventListener('DOMContentLoaded', function() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const filesList = document.getElementById('filesList');
    const workspacesGrid = document.getElementById('workspacesGrid');
    const workspacesList = document.getElementById('workspacesList');
    const pinDialog = document.getElementById('pinDialog');
    
    if (!dropZone) return; // Only run on upload page

    const uploadedFiles = new Map(); // Store uploaded files
    const decryptedWorkspaces = new Map(); // Store decrypted workspaces
    let currentFile = null;

    // Register dialog polyfill if needed
    if (!pinDialog.showModal) {
        dialogPolyfill.registerDialog(pinDialog);
    }

    // Drag and drop handlers
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-over');
        handleFiles(Array.from(e.dataTransfer.files));
    });

    // Click to upload
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        handleFiles(Array.from(e.target.files));
        fileInput.value = ''; // Reset input to allow selecting the same file again
    });

    function handleFiles(files) {
        files.forEach(file => {
            if (file.name.endsWith('.mydre')) {
                if (!uploadedFiles.has(file.name)) {
                    uploadedFiles.set(file.name, file);
                    addFileToList(file);
                }
            } else {
                alert('Please upload only .mydre files');
            }
        });
    }

    function addFileToList(file) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <i class="material-icons">description</i>
            <span class="file-name">${file.name}</span>
            <i class="material-icons status-icon decrypt-trigger" title="Click to decrypt">hourglass_empty</i>
            <i class="material-icons remove-file">close</i>
        `;

        // Add click handler for decryption
        fileItem.querySelector('.decrypt-trigger').addEventListener('click', () => {
            if (!decryptedWorkspaces.has(file.name)) {
                promptForPin(file);
            }
        });

        fileItem.querySelector('.remove-file').addEventListener('click', () => {
            uploadedFiles.delete(file.name);
            // Remove associated workspaces
            const workspaces = decryptedWorkspaces.get(file.name);
            if (workspaces) {
                decryptedWorkspaces.delete(file.name);
                updateWorkspacesGrid();
            }
            fileItem.remove();
        });

        filesList.appendChild(fileItem);
    }

    function promptForPin(file) {
        currentFile = file;
        document.getElementById('currentFileName').textContent = file.name;
        document.getElementById('filePin').value = '';
        pinDialog.showModal();
    }

    // Dialog handlers
    document.getElementById('decryptButton').addEventListener('click', async () => {
        const pin = document.getElementById('filePin').value;
        if (pin.length < 6) {
            alert('PIN must be at least 6 characters');
            return;
        }

        try {
            const fileData = await readFileAsBase64(currentFile);
            const response = await fetch('/api/v1/config/decrypt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    encrypted_data: fileData,
                    pin: pin
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to decrypt file');
            }

            const data = await response.json();
            if (data.workspaces) {
                decryptedWorkspaces.set(currentFile.name, data.workspaces);
                updateFileStatus(currentFile.name, true);
                updateWorkspacesGrid();
                pinDialog.close();
            }
        } catch (error) {
            console.error('Error:', error);
            updateFileStatus(currentFile.name, false);
            const errorMessage = error.message || 'Failed to decrypt file. Please check your PIN and try again.';
            alert(errorMessage);
        }
    });

    document.getElementById('cancelButton').addEventListener('click', () => {
        pinDialog.close();
    });

    function updateFileStatus(fileName, success) {
        const fileItem = Array.from(filesList.children)
            .find(item => item.querySelector('.file-name').textContent === fileName);
        
        if (fileItem) {
            const statusIcon = fileItem.querySelector('.status-icon');
            statusIcon.textContent = success ? 'check_circle' : 'error';
            statusIcon.className = `material-icons status-icon ${success ? 'success' : 'error'}`;
        }
    }

    function updateWorkspacesGrid() {
        const allWorkspaces = new Map();
        const duplicateNames = new Set();

        // First pass: collect workspaces and identify duplicates
        for (const [fileName, workspaces] of decryptedWorkspaces) {
            const workspacesData = workspaces.workspaces || workspaces;
            
            for (const [name, config] of Object.entries(workspacesData)) {
                if (allWorkspaces.has(name)) {
                    duplicateNames.add(name);
                }
                allWorkspaces.set(name, { ...config, sourceFile: fileName });
            }
        }

        // Update grid
        workspacesList.innerHTML = '';
        allWorkspaces.forEach((config, name) => {
            const row = document.createElement('div');
            row.className = `mdl-grid workspace-row ${duplicateNames.has(name) ? 'duplicate' : ''}`;
            row.innerHTML = `
                <div class="mdl-cell mdl-cell--2-col workspace-name">${name}</div>
                <div class="mdl-cell mdl-cell--2-col">${config.workspace_key}</div>
                <div class="mdl-cell mdl-cell--2-col">${config.subscription_key}</div>
                <div class="mdl-cell mdl-cell--2-col">${config.uploader_name}</div>
                <div class="mdl-cell mdl-cell--3-col source-file">${config.sourceFile}</div>
                <div class="mdl-cell mdl-cell--1-col">
                    <i class="material-icons remove-workspace" 
                       title="Remove workspace" 
                       data-workspace="${name}" 
                       data-source="${config.sourceFile}">
                        delete
                    </i>
                </div>
            `;

            // Add click handler for remove button
            const removeButton = row.querySelector('.remove-workspace');
            removeButton.addEventListener('click', () => {
                const workspaceName = removeButton.dataset.workspace;
                const sourceFile = removeButton.dataset.source;
                removeWorkspace(workspaceName, sourceFile);
            });

            workspacesList.appendChild(row);
        });

        // Show/hide sections
        workspacesGrid.style.display = allWorkspaces.size > 0 ? 'block' : 'none';
    }

    function removeWorkspace(workspaceName, sourceFile) {
        const fileWorkspaces = decryptedWorkspaces.get(sourceFile);
        if (fileWorkspaces) {
            const workspacesData = fileWorkspaces.workspaces || fileWorkspaces;
            delete workspacesData[workspaceName];
            
            // If this was the last workspace in the file, update the file status
            if (Object.keys(workspacesData).length === 0) {
                decryptedWorkspaces.delete(sourceFile);
                updateFileStatus(sourceFile, 'removed');
            }
            
            updateWorkspacesGrid();
        }
    }

    function readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64Data = reader.result.split(',')[1];
                resolve(base64Data);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
}); 