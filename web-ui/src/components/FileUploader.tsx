import { useState, useRef } from 'react'
import type { ScanResult } from '../App'
import './FileUploader.css'

interface FileUploaderProps {
    onFileLoad: (result: ScanResult) => void;
}

export default function FileUploader({ onFileLoad }: FileUploaderProps) {
    const [isDragging, setIsDragging] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = () => {
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)

        const files = e.dataTransfer.files
        if (files.length > 0) {
            handleFile(files[0])
        }
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (files && files.length > 0) {
            handleFile(files[0])
        }
    }

    const handleFile = (file: File) => {
        setError(null)

        if (!file.name.endsWith('.json')) {
            setError('Please upload a JSON file')
            return
        }

        const reader = new FileReader()

        reader.onload = (e) => {
            try {
                const content = e.target?.result as string
                const data = JSON.parse(content)

                // Strict validation
                if (!data.programId ||
                    !data.summary ||
                    !data.accounts ||
                    !Array.isArray(data.accounts) ||
                    !data.graph) {
                    setError('Invalid scan result format')
                    return
                }

                onFileLoad(data as ScanResult)
            } catch (err) {
                setError('Failed to parse JSON file')
            }
        }

        reader.onerror = () => {
            setError('Failed to read file')
        }

        reader.readAsText(file)
    }

    const handleClick = () => {
        fileInputRef.current?.click()
    }

    return (
        <div className="file-uploader-container">
            <div
                className={`file-uploader ${isDragging ? 'dragging' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleClick}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                />

                <div className="upload-icon">📁</div>
                <h3>Load Scan Results</h3>
                <p className="upload-instructions">
                    Drag and drop your scan result JSON file here, or click to browse
                </p>

                <div className="upload-hint">
                    <code>ghost-scan-*.json</code>
                </div>
            </div>

            {error && (
                <div className="error-message">
                    <span className="error-icon">⚠️</span>
                    {error}
                </div>
            )}
        </div>
    )
}
