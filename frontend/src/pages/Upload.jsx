import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Upload, FileText, CheckCircle, XCircle, ArrowRight } from 'lucide-react';

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const navigate = useNavigate();

  const onDrop = useCallback((accepted, rejected) => {
    if (rejected.length > 0) {
      toast.error('Only PDF files are allowed (max 10MB)');
      return;
    }
    setFile(accepted[0]);
    setResult(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('statement', file);
    try {
      const { data } = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult({ success: true, ...data });
      toast.success(`Processed ${data.transactionCount} transactions!`);
      setFile(null);
    } catch (err) {
      const msg = err.response?.data?.message || 'Upload failed';
      toast.error(msg);
      setResult({ success: false, message: msg });
    } finally {
      setUploading(false);
    }
  };

  const fmtSize = (bytes) => bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

  return (
    <div className="fade-in" style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Upload Bank Statement</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Upload a PDF bank statement to automatically extract and analyze your transactions.
        </p>
      </div>

      {/* Drop Zone */}
      <div {...getRootProps()} className={`upload-zone ${isDragActive ? 'active' : ''}`}>
        <input {...getInputProps()} />
        <div className="upload-icon">📄</div>
        <div className="upload-title">{isDragActive ? 'Drop your PDF here' : 'Drag & drop your bank statement'}</div>
        <div className="upload-sub">or click to browse — PDF only, max 10MB</div>
        {!isDragActive && (
          <button className="btn btn-primary btn-sm" style={{ marginTop: 20 }} type="button">
            <Upload size={14} /> Choose File
          </button>
        )}
      </div>

      {/* Selected File */}
      {file && (
        <div className="card" style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, background: 'rgba(59,130,246,0.15)', borderRadius: 10, display: 'grid', placeItems: 'center', fontSize: 22, flexShrink: 0 }}>📑</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>{file.name}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{fmtSize(file.size)} · PDF Document</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => { setFile(null); setResult(null); }}>Remove</button>
            <button className="btn btn-primary btn-sm" onClick={handleUpload} disabled={uploading}>
              {uploading ? (
                <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Processing…</>
              ) : (
                <><Upload size={14} /> Upload & Analyze</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Progress */}
      {uploading && (
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>🔄 Extracting transactions from PDF…</div>
          <div className="progress-bar"><div className="progress-fill" style={{ width: '70%' }} /></div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>This may take a few seconds</div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`card`} style={{ marginTop: 20, borderColor: result.success ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            {result.success ? <CheckCircle size={24} color="#10b981" /> : <XCircle size={24} color="#ef4444" />}
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{result.success ? 'Upload Successful!' : 'Upload Failed'}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{result.message}</div>
            </div>
          </div>
          {result.success && (
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/transactions')}>
                View Transactions <ArrowRight size={14} />
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/analytics')}>
                View Analytics
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setResult(null)}>
                Upload Another
              </button>
            </div>
          )}
        </div>
      )}

      {/* Info Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16, marginTop: 32 }}>
        {[
          { icon: '🔒', title: 'Secure', desc: 'Files are processed server-side and stored safely' },
          { icon: '⚡', title: 'Fast', desc: 'Transactions extracted in seconds using smart parsing' },
          { icon: '📊', title: 'Insights', desc: 'Automatic categorization and spending analytics' },
        ].map((item, i) => (
          <div key={i} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{item.icon}</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{item.title}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
