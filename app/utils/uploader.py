#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Upload functionality for myDRE workspace.

This module handles the secure file upload process to myDRE workspaces.
"""

import requests
from datetime import datetime
from azure.storage.blob import ContainerClient
import base64
import os



class Upload:
    """Handles secure file uploads to myDRE workspace."""
    def __init__(self, workspace_name, workspace_key, subscription_key, uploader_name):
        self.workspace_name = workspace_name
        # self.workspace_description = w_description
        self.workspace_key = workspace_key
        self.tenant_key = subscription_key
        self.uploader = uploader_name
        self.BASE_URL = 'https://andreanl-api-management.azure-api.net/v1'
        self.container_location = ''
        self.uploaded_files = []  # Keep track of uploaded files
        self.log_file_path = os.path.join(os.path.dirname(__file__), 'upload_log.txt')
        
        # Get the path to the favicon
        self.icon_path = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'favicon.ico')

    def getHeaders(self):
        return {
            'Api-Key': self.workspace_key,
            'Ocp-Apim-Subscription-Key': self.tenant_key
        }

    def _make_request(self, method, endpoint, data=None):
        url = f"{self.BASE_URL}{endpoint}"
        response = requests.request(str(method).upper(), url, headers=self.getHeaders(), json=data) 
        response.raise_for_status()
        return response

    def create_workspace_container(self):
        timestamp = f'{datetime.now():%Y%m%d %H%M%S}'
        title = f'{timestamp} {self.workspace_name}'
        endpoint = f"/api/workspace/{self.workspace_name}/files/containers"
        url = f"{self.BASE_URL}{endpoint}"
    
        params = {'title': title}
        response = requests.post(url, headers=self.getHeaders(), params=params)
        response.raise_for_status()  
        self.container_location = response.headers['Location']
        self.uploaded_files = []  # Reset uploaded files list
        
    def commit_workspace_container(self):
        container_identifier = self.container_location.rsplit('/', 1)[-1]
        endpoint = f"/api/workspace/{self.workspace_name}/files/containers/{container_identifier}"
        url = f"{self.BASE_URL}{endpoint}"
    
        response = requests.patch(url, headers=self.getHeaders())
        response.raise_for_status()
        return response

    def file2(self, local_file_path):
        # Check if file exists before proceeding
        if not os.path.exists(local_file_path):
            raise FileNotFoundError(f"File not found: {local_file_path}")
            
        file_name = os.path.basename(local_file_path)
        # Log the file before upload
        self._log_upload(file_name)
        
        container_client = ContainerClient.from_container_url(self.container_location)
        with open(local_file_path, "rb") as file_to_upload:
            container_client.upload_blob(file_name, file_to_upload, overwrite=True)
            self.uploaded_files.append(file_name)

    def _log_upload(self, file_name):
        """Log uploaded file with timestamp to a text file."""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        log_entry = f"{timestamp} - Preparing to upload: {file_name} to workspace: {self.workspace_name}\n"
        try:
            with open(self.log_file_path, 'a', encoding='utf-8') as log_file:
                log_file.write(log_entry)
        except Exception as e:
            print(f"Warning: Could not write to log file: {e}")

    def get_uploaded_files(self):
        """Return the list of uploaded files."""
        return self.uploaded_files 

    def get_upload_log(self):
        """Read and return the contents of the upload log file."""
        try:
            if os.path.exists(self.log_file_path):
                with open(self.log_file_path, 'r', encoding='utf-8') as log_file:
                    return log_file.read()
            return "No upload history found."
        except Exception as e:
            return f"Error reading upload log: {e}"



   

           