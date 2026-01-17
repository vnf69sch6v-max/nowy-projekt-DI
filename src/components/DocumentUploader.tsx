'use client';

import { useCallback, useState } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { AnimatePresence, motion } from 'framer-motion';
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface UploadedFile {
    file: File;
    id: string;
    status: 'success' | 'error';
}

interface DocumentUploaderProps {
    onFilesChange: (files: File[]) => void;
    acceptedTypes?: string[];
    maxFiles?: number;
    maxSize?: number;
    label: string;
    hint?: string;
    required?: boolean;
}

export default function DocumentUploader({
    onFilesChange,
    acceptedTypes = ['.pdf'],
    maxFiles = 1,
    maxSize = 10 * 1024 * 1024,
    label,
    hint,
    required = false,
}: DocumentUploaderProps) {
    const [files, setFiles] = useState<UploadedFile[]>([]);

    const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
        rejectedFiles.forEach((rejection) => {
            console.warn('File rejected:', rejection.file.name);
        });

        const newFiles: UploadedFile[] = acceptedFiles.map((file) => ({
            file,
            id: `${file.name}-${Date.now()}`,
            status: 'success' as const,
        }));

        // Użyj funkcji aktualizującej stan bez wywoływania callback w środku
        setFiles((prev) => {
            const updated = [...prev, ...newFiles].slice(-maxFiles);
            // Wywołaj callback po zakończeniu tej funkcji przez setTimeout
            setTimeout(() => onFilesChange(updated.map((f) => f.file)), 0);
            return updated;
        });
    }, [maxFiles, onFilesChange]);

    const removeFile = useCallback((id: string) => {
        setFiles((prev) => {
            const updated = prev.filter((f) => f.id !== id);
            setTimeout(() => onFilesChange(updated.map((f) => f.file)), 0);
            return updated;
        });
    }, [onFilesChange]);

    const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
        onDrop,
        accept: acceptedTypes.reduce((acc, type) => {
            if (type === '.pdf') acc['application/pdf'] = ['.pdf'];
            if (type === '.xlsx') acc['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] = ['.xlsx'];
            if (type === '.xls') acc['application/vnd.ms-excel'] = ['.xls'];
            return acc;
        }, {} as Record<string, string[]>),
        maxFiles,
        maxSize,
        multiple: maxFiles > 1,
    });

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="w-full">
            <label className="block text-sm font-medium text-white/80 mb-2">
                {label}
                {required && <span className="text-red-400 ml-1">*</span>}
            </label>

            <div
                {...getRootProps()}
                className={`
          relative border-2 border-dashed rounded-xl p-6 cursor-pointer
          transition-all duration-200 ease-out
          ${isDragActive && !isDragReject ? 'border-purple-500 bg-purple-500/10 scale-[1.02]' : ''}
          ${isDragReject ? 'border-red-500 bg-red-500/10' : ''}
          ${!isDragActive ? 'border-white/20 hover:border-purple-400/50 hover:bg-white/5' : ''}
        `}
            >
                <input {...getInputProps()} />

                <div className="flex flex-col items-center text-center">
                    <div className={`transition-transform duration-200 ${isDragActive ? '-translate-y-1 scale-110' : ''}`}>
                        {isDragReject ? (
                            <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
                        ) : (
                            <Upload className={`w-10 h-10 mb-3 ${isDragActive ? 'text-purple-400' : 'text-white/40'}`} />
                        )}
                    </div>

                    <p className="text-white/70 text-sm">
                        {isDragReject ? (
                            'Ten typ pliku nie jest obsługiwany'
                        ) : isDragActive ? (
                            'Upuść plik tutaj...'
                        ) : (
                            <>
                                <span className="text-purple-400">Przeciągnij plik</span> lub kliknij
                            </>
                        )}
                    </p>

                    {hint && <p className="text-white/40 text-xs mt-2">{hint}</p>}

                    <p className="text-white/30 text-xs mt-1">
                        {acceptedTypes.join(', ')} • max {formatFileSize(maxSize)}
                    </p>
                </div>
            </div>

            <AnimatePresence mode="popLayout">
                {files.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 space-y-2"
                    >
                        {files.map((uploadedFile) => (
                            <motion.div
                                key={uploadedFile.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/30"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <FileText className="w-5 h-5 text-green-400 flex-shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-sm text-white/90 truncate">{uploadedFile.file.name}</p>
                                        <p className="text-xs text-white/40">{formatFileSize(uploadedFile.file.size)}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-green-400" />
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeFile(uploadedFile.id);
                                        }}
                                        className="p-1 hover:bg-white/10 rounded-full transition-colors"
                                    >
                                        <X className="w-4 h-4 text-white/50 hover:text-white/80" />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
