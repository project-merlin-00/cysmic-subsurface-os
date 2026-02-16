import React, { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

interface ParsedFile {
  file_type: string;
  success: boolean;
  data?: {
    well?: Record<string, unknown>;
    curves?: Array<{ mnemonic: string; unit?: string }>;
    columns?: string[];
    metadata?: Record<string, unknown>;
  };
  error?: string;
}

interface FileIngestionWidgetProps {
  onFileParsed?: (data: ParsedFile) => void;
}

export function FileIngestionWidget({ onFileParsed }: FileIngestionWidgetProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setParsedFile(null);

    try {
      // In a real app, this would call the backend API
      // For now, simulate parsing based on file extension
      const ext = file.name.split('.').pop()?.toLowerCase();
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock response based on file type
      const mockResponse: ParsedFile = {
        file_type: ext || 'unknown',
        success: true,
        data: {
          well: { name: file.name.replace(/\.[^/.]+$/, '') },
          curves: [
            { mnemonic: 'DEPT', unit: 'm' },
            { mnemonic: 'GR', unit: 'gAPI' },
            { mnemonic: 'RES', unit: 'ohm-m' },
            { mnemonic: 'RHOB', unit: 'g/cm3' },
            { mnemonic: 'NPHI', unit: 'v/v' },
          ],
          metadata: { rows: 1000, columns: 5 }
        }
      };

      setParsedFile(mockResponse);
      onFileParsed?.(mockResponse);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to parse file';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  const supportedFormats = ['.las', '.dlis', '.csv', '.txt', '.dat'];

  return (
    <div className="bg-white border border-sandstone-200 rounded-lg shadow-panel overflow-hidden max-w-md">
      {/* Header */}
      <div className="bg-sandstone-50 px-4 py-3 border-b border-sandstone-200 flex items-center gap-2">
        <Upload className="w-4 h-4 text-primary-600" />
        <h3 className="font-semibold text-sandstone-900 text-sm">File Ingestion</h3>
      </div>

      <div className="p-4">
        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={clsx(
            'border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer',
            isDragging 
              ? 'border-primary-500 bg-primary-50' 
              : 'border-sandstone-300 hover:border-primary-400 hover:bg-sandstone-50'
          )}
        >
          {isLoading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
              <p className="text-sm text-sandstone-600">Parsing file...</p>
            </div>
          ) : parsedFile ? (
            <div className="flex flex-col items-center gap-2">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <p className="text-sm font-medium text-green-700">File parsed successfully</p>
              <p className="text-xs text-sandstone-500">{parsedFile.file_type.toUpperCase()} file</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2">
              <AlertCircle className="w-8 h-8 text-red-500" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 text-sandstone-400 mx-auto mb-2" />
              <p className="text-sm text-sandstone-600 mb-1">
                Drag & drop file here
              </p>
              <p className="text-xs text-sandstone-400">
                or click to browse
              </p>
            </>
          )}
          
          <input
            type="file"
            onChange={handleFileSelect}
            accept={supportedFormats.join(',')}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isLoading}
          />
        </div>

        {/* Supported Formats */}
        <div className="mt-4">
          <p className="text-xs font-medium text-sandstone-500 uppercase tracking-wide mb-2">
            Supported Formats
          </p>
          <div className="flex flex-wrap gap-2">
            {supportedFormats.map(fmt => (
              <span 
                key={fmt}
                className="inline-flex items-center gap-1 px-2 py-1 bg-sandstone-100 text-sandstone-600 text-xs rounded font-mono"
              >
                <FileText className="w-3 h-3" />
                {fmt}
              </span>
            ))}
          </div>
        </div>

        {/* Parsed Data Preview */}
        {parsedFile?.data && (
          <div className="mt-4 p-3 bg-sandstone-50 rounded-lg">
            <p className="text-xs font-medium text-sandstone-700 uppercase tracking-wide mb-2">
              Detected Curves
            </p>
            <div className="flex flex-wrap gap-1">
              {parsedFile.data.curves?.map((curve, idx) => (
                <span 
                  key={idx}
                  className="inline-flex items-center px-2 py-0.5 bg-white border border-sandstone-200 text-xs font-mono text-sandstone-700 rounded"
                >
                  {curve.mnemonic}
                  {curve.unit && <span className="text-sandstone-400 ml-1">({curve.unit})</span>}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
