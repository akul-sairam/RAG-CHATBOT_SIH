import React, { useRef, useState } from 'react';
import { UploadCloud, CheckCircle, Loader2 } from 'lucide-react';

const Navbar = () => {
  const fileInputRef = useRef(null);
  const [uploadStatus, setUploadStatus] = useState('idle'); // 'idle', 'uploading', 'success', 'error'
  const [errorMessage, setErrorMessage] = useState('');

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setUploadStatus('error');
      setErrorMessage('Please upload a PDF file.');
      return;
    }

    setUploadStatus('uploading');
    const formData = new FormData();
    formData.append('file', file);

    fetch('/upload', {
      method: 'POST',
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setUploadStatus('error');
          setErrorMessage(data.error);
        } else {
          setUploadStatus('success');
          // Clear chat when new PDF is uploaded
          sessionStorage.removeItem('chat_messages');
          // We don't reload the page immediately to let user see success, 
          // but we will reload after 1.5s
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      })
      .catch((err) => {
        setUploadStatus('error');
        setErrorMessage(err.message);
      })
      .finally(() => {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      });
  };

  return (
    <nav className="flex justify-between items-center px-8 py-4 bg-gray-900 text-white border-b border-gray-800">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center font-bold">R</div>
        <div className="text-xl font-semibold tracking-tight text-cyan-50">DocuChat</div>
      </div>
      
      <div className="flex gap-4 items-center">
        {uploadStatus === 'error' && <span className="text-red-400 text-sm">{errorMessage}</span>}
        {uploadStatus === 'success' && <span className="text-green-400 text-sm flex items-center gap-1"><CheckCircle size={16}/> Uploaded</span>}
        
        <input
          type="file"
          accept=".pdf"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileUpload}
        />
        
        <button
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-cyan-300 rounded-lg hover:bg-gray-700 transition-colors border border-gray-700 text-sm font-medium"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadStatus === 'uploading'}
        >
          {uploadStatus === 'uploading' ? (
            <><Loader2 className="animate-spin" size={16} /> Processing...</>
          ) : (
            <><UploadCloud size={16} /> Upload PDF</>
          )}
        </button>

        <button
          className="px-4 py-2 bg-gray-800 text-red-400 rounded-lg hover:bg-gray-700 transition-colors border border-gray-700 text-sm font-medium"
          onClick={() => {
            sessionStorage.removeItem('chat_messages');
            window.location.reload();
          }}
        >
          Clear Chat
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
