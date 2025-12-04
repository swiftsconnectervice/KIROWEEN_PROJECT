/**
 * Manual Injector View
 * Allows manual injection of insurance claims for testing
 * Matches FrankenStack visual theme
 */

import React, { useState } from 'react';
import { Syringe, Send, CheckCircle, XCircle, Loader, Camera, X } from 'lucide-react';

interface ProcessingResult {
  success: boolean;
  decision?: string;
  fraudRisk?: string;
  reasons?: string[];
  error?: string;
}

interface InjectorViewProps {
  onClose?: () => void;
}

export const InjectorView: React.FC<InjectorViewProps> = ({ onClose }) => {
  const [subject, setSubject] = useState('');
  const [location, setLocation] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    // Validar tamaño (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size must be less than 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setImageBase64(base64String);
      setImagePreview(base64String);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImageBase64(null);
    setImagePreview(null);
  };

  const handleInject = async () => {
    if (!subject || !location || !emailBody) {
      alert('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('http://localhost:4000/api/manual-claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject,
          body: emailBody,
          location,
          imageBase64: imageBase64 || undefined
        })
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          decision: data.decision,
          fraudRisk: data.fraudRisk,
          reasons: data.reasons
        });
      } else {
        setResult({
          success: false,
          error: data.error || 'Unknown error'
        });
      }
    } catch (error) {
      setResult({
        success: false,
        error: `Connection failed: ${error}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      {/* Glow Effect */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-full max-w-2xl h-[85vh] bg-cyan-500/20 rounded-xl blur-3xl animate-pulse" />
      </div>
      
      <div className="relative bg-gray-900 w-full max-w-2xl rounded-xl border-2 border-cyan-500/50 
                      shadow-[0_0_50px_rgba(6,182,212,0.3)] animate-in fade-in zoom-in-95 duration-200 
                      max-h-[85vh] overflow-hidden flex flex-col">
        
        {/* Header con Botón Cerrar */}
        <div className="p-6 border-b border-cyan-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Syringe className="w-6 h-6 text-cyan-400" />
            <div>
              <h2 className="text-2xl font-bold text-cyan-400">
                Claim Injector
              </h2>
              <p className="text-gray-400 text-xs mt-1">
                Inject custom claims into the processing pipeline
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-gray-800 hover:bg-red-600 rounded-full 
                     transition-colors border border-cyan-400/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Contenido con Scroll */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">

          <div className="space-y-4">
          {/* Subject Field */}
          <div>
            <label className="block text-sm font-semibold text-purple-400 mb-2">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Insurance Claim - Hurricane Damage"
              className="w-full px-4 py-3 bg-gray-900 border border-purple-500/30 rounded-lg 
                       text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 
                       focus:ring-2 focus:ring-purple-500/20 transition-all"
            />
          </div>

          {/* Location Field */}
          <div>
            <label className="block text-sm font-semibold text-green-400 mb-2">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Miami, FL"
              className="w-full px-4 py-3 bg-gray-900 border border-purple-500/30 rounded-lg 
                       text-white placeholder-gray-500 focus:outline-none focus:border-green-500 
                       focus:ring-2 focus:ring-green-500/20 transition-all"
            />
          </div>

          {/* Email Body Field */}
          <div>
            <label className="block text-sm font-semibold text-purple-400 mb-2">
              Email Body
            </label>
            <textarea
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              placeholder={`Policy Number: AUTO-1234567
Claimant: John Smith
Date of Loss: ${new Date().toISOString()}
Location: Miami, FL
Damage Type: Hurricane
Estimated Cost: $25,000
Description: Roof damage from hurricane winds`}
              rows={12}
              className="w-full px-4 py-3 bg-gray-900 border border-purple-500/30 rounded-lg 
                       text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 
                       focus:ring-2 focus:ring-purple-500/20 transition-all font-mono text-sm
                       resize-none"
            />
          </div>

          {/* Image Upload Field */}
          <div>
            <label className="block text-sm font-semibold text-green-400 mb-2">
              📸 Photographic Evidence (Optional)
            </label>
            
            {!imagePreview ? (
              <label className="w-full flex flex-col items-center justify-center px-4 py-8 
                              bg-gray-900 border-2 border-dashed border-purple-500/30 rounded-lg 
                              cursor-pointer hover:border-purple-500 hover:bg-gray-900/50 
                              transition-all group">
                <Camera className="w-12 h-12 text-purple-400 group-hover:text-purple-300 mb-3" />
                <span className="text-sm text-gray-400 group-hover:text-gray-300">
                  Click to upload damage photo
                </span>
                <span className="text-xs text-gray-500 mt-1">
                  Supports: JPG, PNG, GIF (Max 10MB)
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="relative bg-gray-900 border border-purple-500/30 rounded-lg p-4">
                <button
                  onClick={clearImage}
                  className="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-700 
                           rounded-full transition-all z-10"
                >
                  <X className="w-4 h-4" />
                </button>
                <img
                  src={imagePreview}
                  alt="Damage preview"
                  className="w-full h-64 object-contain rounded"
                />
                <p className="text-xs text-green-400 text-center mt-2">
                  ✓ Image uploaded - AI Vision will analyze this
                </p>
              </div>
            )}
          </div>

          {/* Inject Button */}
          <button
            onClick={handleInject}
            disabled={isLoading}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-purple-700 
                     hover:from-purple-700 hover:to-purple-800 text-white font-bold text-lg 
                     rounded-lg shadow-lg shadow-purple-500/50 hover:shadow-purple-500/70
                     transition-all duration-200 flex items-center justify-center gap-3
                     border border-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader className="w-6 h-6 animate-spin" />
                PROCESSING...
              </>
            ) : (
              <>
                <Send className="w-6 h-6" />
                INJECT CLAIM
              </>
            )}
          </button>

          {/* Result Display */}
          {result && (
            <div className={`mt-6 p-6 rounded-lg border-2 ${
              result.success 
                ? result.decision === 'APPROVE' 
                  ? 'bg-green-900/30 border-green-500/50' 
                  : 'bg-yellow-900/30 border-yellow-500/50'
                : 'bg-red-900/30 border-red-500/50'
            }`}>
              <div className="flex items-center gap-3 mb-4">
                {result.success ? (
                  result.decision === 'APPROVE' ? (
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  ) : (
                    <XCircle className="w-8 h-8 text-yellow-400" />
                  )
                ) : (
                  <XCircle className="w-8 h-8 text-red-400" />
                )}
                <div>
                  <h3 className="text-xl font-bold">
                    {result.success 
                      ? `Decision: ${result.decision}` 
                      : 'Processing Failed'
                    }
                  </h3>
                  {result.fraudRisk && (
                    <p className="text-sm text-gray-400">
                      Fraud Risk: <span className={`font-semibold ${
                        result.fraudRisk === 'low' ? 'text-green-400' :
                        result.fraudRisk === 'medium' ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>{result.fraudRisk.toUpperCase()}</span>
                    </p>
                  )}
                </div>
              </div>
              
              {result.reasons && result.reasons.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-semibold text-gray-300">Reasoning:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {result.reasons.map((reason, idx) => (
                      <li key={idx} className="text-sm text-gray-400">{reason}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {result.error && (
                <p className="text-sm text-red-300">{result.error}</p>
              )}
            </div>
          )}

          {/* Info Box */}
          <div className="mt-6 p-4 bg-purple-900/30 rounded-lg border border-purple-500/30">
            <p className="text-xs text-gray-400 text-center">
              💉 Claims are processed through the full pipeline: Parser → Weather API → AI Validator → SQLite
            </p>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};
