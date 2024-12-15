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
        }

        initializeDropZone() {
            this.dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.dropZone.classList.add('drag-over');
            });

            this.dropZone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.dropZone.classList.remove('drag-over');
            });

            this.dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.dropZone.classList.remove('drag-over');
                this.handleFiles(Array.from(e.dataTransfer.files));
            });

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

        handleFiles(files) {
            files.forEach(file => {
                if (file.name.endsWith('.mydre')) {
                    this.addFileToList(file);
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
            statusIcon.className = 'material-icons status-icon';
            statusIcon.style.display = 'none';
            
            const removeButton = document.createElement('button');
            removeButton.className = 'mdl-button mdl-js-button mdl-button--icon';
            removeButton.innerHTML = '<i class="material-icons">close</i>';
            removeButton.addEventListener('click', () => this.removeFile(file.name));
            
            fileDiv.appendChild(fileIcon);
            fileDiv.appendChild(fileName);
            fileDiv.appendChild(statusIcon);
            fileDiv.appendChild(removeButton);
            
            this.filesList.appendChild(fileDiv);
            this.uploadedFiles.set(file.name, { file, element: fileDiv });
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

        getFile(fileName) {
            const fileData = this.uploadedFiles.get(fileName);
            return fileData ? fileData.file : null;
        }

        getAllFiles() {
            return Array.from(this.uploadedFiles.values()).map(data => data.file);
        }
    }

    document.addEventListener('DOMContentLoaded', function() {
        // Get all form elements specific to upload page
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        const filesList = document.getElementById('filesList');
        const uploadButton = document.getElementById('uploadButton');
        
        // Initialize file handler
        const fileHandler = new UploadFileHandler(dropZone, fileInput, filesList);

        // Handle file upload
        async function handleUpload() {
            const files = fileHandler.getAllFiles();
            if (files.length === 0) {
                alert('Please add files to upload');
                return;
            }

            uploadButton.disabled = true;
            uploadButton.textContent = 'Uploading...';

            try {
                for (const file of files) {
                    const formData = new FormData();
                    formData.append('file', file);

                    const response = await fetch('/api/v1/upload', {
                        method: 'POST',
                        body: formData
                    });

                    if (!response.ok) {
                        throw new Error(`Failed to upload ${file.name}`);
                    }

                    fileHandler.updateFileStatus(file.name, true);
                }

                alert('All files uploaded successfully');

            } catch (error) {
                console.error('Upload error:', error);
                alert('Failed to upload some files. Please try again.');
            } finally {
                uploadButton.disabled = false;
                uploadButton.textContent = 'Upload';
            }
        }

        // Initialize upload button
        if (uploadButton) {
            uploadButton.addEventListener('click', handleUpload);
        }
    });
} 