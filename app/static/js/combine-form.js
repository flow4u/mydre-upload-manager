document.addEventListener('DOMContentLoaded', function() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const filesList = document.getElementById('filesList');
    const workspacesGrid = document.getElementById('workspacesGrid');
    const workspacesList = document.getElementById('workspacesList');
    const outputConfig = document.getElementById('outputConfig');
    const combineButton = document.getElementById('combineButton');
    const pinDialog = document.getElementById('pinDialog');
    
    if (!dropZone) return; // Only run on combine page

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
            validateForm();
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
                throw new Error('Failed to decrypt file');
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
            alert('Failed to decrypt file. Please check your PIN and try again.');
        }
    });

    document.getElementById('cancelButton').addEventListener('click', () => {
        pinDialog.close();
    });

    function updateFileStatus(fileName, status) {
        const fileItem = Array.from(filesList.children)
            .find(item => item.querySelector('.file-name').textContent === fileName);
        
        if (fileItem) {
            const statusIcon = fileItem.querySelector('.status-icon');
            switch(status) {
                case true:
                    statusIcon.textContent = 'check_circle';
                    statusIcon.className = 'material-icons status-icon success';
                    break;
                case false:
                    statusIcon.textContent = 'error';
                    statusIcon.className = 'material-icons status-icon error';
                    break;
                case 'removed':
                    statusIcon.textContent = 'hourglass_empty';
                    statusIcon.className = 'material-icons status-icon decrypt-trigger';
                    statusIcon.title = 'Click to decrypt';
                    break;
            }
        }
    }

    function updateWorkspacesGrid() {
        const allWorkspaces = new Map();
        let hasDuplicates = false;

        // Collect all workspaces
        for (const [fileName, workspaces] of decryptedWorkspaces) {
            const workspacesData = workspaces.workspaces || workspaces;
            
            for (const [name, config] of Object.entries(workspacesData)) {
                if (allWorkspaces.has(name)) {
                    hasDuplicates = true;
                    alert(`Duplicate workspace name found: ${name}`);
                } else {
                    allWorkspaces.set(name, { ...config, sourceFile: fileName });
                }
            }
        }

        // Update grid
        workspacesList.innerHTML = '';
        allWorkspaces.forEach((config, name) => {
            const row = document.createElement('div');
            row.className = 'mdl-grid workspace-row';
            row.innerHTML = `
                <div class="mdl-cell mdl-cell--3-col">${name}</div>
                <div class="mdl-cell mdl-cell--3-col">${config.workspace_key}</div>
                <div class="mdl-cell mdl-cell--2-col">${config.subscription_key}</div>
                <div class="mdl-cell mdl-cell--3-col">${config.uploader_name}</div>
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
        outputConfig.style.display = allWorkspaces.size > 0 && !hasDuplicates ? 'block' : 'none';
        validateForm();
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

    function validateForm() {
        const outputPin = document.getElementById('outputPin');
        const hasWorkspaces = decryptedWorkspaces.size > 0;
        const isValid = hasWorkspaces && outputPin.value.length >= 6;
        combineButton.disabled = !isValid;
    }

    // Handle output PIN changes
    document.getElementById('outputPin').addEventListener('input', validateForm);

    // Handle form submission
    combineButton.addEventListener('click', async () => {
        const outputFilename = document.getElementById('outputFilename').value.trim();
        const outputPin = document.getElementById('outputPin').value;

        if (!outputFilename || outputPin.length < 6) {
            alert('Please provide a valid filename and PIN');
            return;
        }

        try {
            combineButton.disabled = true;
            combineButton.textContent = 'Combining...';

            // Collect all workspaces
            const allWorkspaces = {};
            decryptedWorkspaces.forEach(workspaces => {
                Object.assign(allWorkspaces, workspaces);
            });

            const response = await fetch('/api/v1/combine', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    pin: outputPin,
                    filename: outputFilename,
                    workspaces: allWorkspaces
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to combine configs');
            }

            const blob = await response.blob();
            const fileName = `${outputFilename}.mydre`;
            
            // Download combined file
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            // Reset form
            uploadedFiles.clear();
            decryptedWorkspaces.clear();
            filesList.innerHTML = '';
            workspacesList.innerHTML = '';
            workspacesGrid.style.display = 'none';
            outputConfig.style.display = 'none';
            document.getElementById('outputPin').value = '';
            document.getElementById('outputFilename').value = 'combined_configs';

        } catch (error) {
            console.error('Error:', error);
            alert(error.message || 'Failed to combine configurations. Please try again.');
        } finally {
            combineButton.disabled = false;
            combineButton.textContent = 'Combine and Download';
        }
    });

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