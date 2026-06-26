import React, { useRef, useState } from 'react';
import { UploadCloud, CheckCircle, Loader2, Trash2 } from 'lucide-react';

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
          // Reset to idle after a few seconds so they can upload again
          setTimeout(() => {
            setUploadStatus('idle');
          }, 3000);
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

  const handleClear = () => {
    fetch('/clear', { method: 'POST' })
      .then(() => {
        sessionStorage.removeItem('chat_messages');
        window.location.reload();
      })
      .catch(console.error);
  };

  return (
    <nav className="flex justify-between items-center px-8 py-4 bg-gray-900 text-white border-b border-gray-800">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center font-bold">R</div>
        <div className="text-xl font-semibold tracking-tight text-cyan-50">DocuChat</div>
      </div>
      
      <div className="flex gap-4 items-center">
        {uploadStatus === 'error' && <span className="text-red-400 text-sm">{errorMessage}</span>}
        {uploadStatus === 'success' && <span className="text-green-400 text-sm flex items-center gap-1"><CheckCircle size={16}/> Added to KB</span>}
        
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
            <><UploadCloud size={16} /> Add PDF</>
          )}
        </button>

        <button
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-red-400 rounded-lg hover:bg-gray-700 transition-colors border border-gray-700 text-sm font-medium"
          onClick={handleClear}
        >
          <Trash2 size={16} /> Clear KB
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
