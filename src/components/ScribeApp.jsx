import React, { useState, useRef } from 'react';
import { Mic, Square, Upload, Loader2, FileAudio } from 'lucide-react';

export default function ScribeApp() {
  const [activeTab, setActiveTab] = useState('record'); // 'record' or 'upload'
  const [file, setFile] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [transcription, setTranscription] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    try {
      setFile(null);
      setAudioURL(null);
      setTranscription(null);
      setError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        const recordedFile = new File([blob], 'recording.webm', { type: 'audio/webm' });
        setFile(recordedFile);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      setError('Could not access microphone.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setAudioURL(URL.createObjectURL(selected));
      setTranscription(null);
      setError(null);
    }
  };

  const handleTranscribe = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setTranscription(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Transcription failed');
      }
      
      setTranscription(data.text);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-lg mt-10 text-slate-800">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Medical Scribe</h1>
        <p className="text-slate-600">Powered by ElevenLabs Scribe V2 Medical</p>
      </div>

      <div className="flex justify-center space-x-4 mb-8">
        <button
          onClick={() => setActiveTab('record')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'record' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Record Audio
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'upload' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Upload File
        </button>
      </div>

      <div className="bg-slate-50 p-8 rounded-lg border border-slate-200 mb-8 flex flex-col items-center">
        {activeTab === 'record' ? (
          <div className="flex flex-col items-center space-y-4">
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="flex items-center justify-center w-20 h-20 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-transform hover:scale-105"
                title="Start Recording"
              >
                <Mic size={32} />
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="flex items-center justify-center w-20 h-20 bg-slate-800 hover:bg-slate-900 text-white rounded-full shadow-lg transition-transform hover:scale-105"
                title="Stop Recording"
              >
                <Square size={32} />
              </button>
            )}
            <p className="text-sm font-medium text-slate-500">
              {isRecording ? 'Recording in progress...' : 'Click to start recording'}
            </p>
          </div>
        ) : (
          <div className="w-full max-w-md">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-slate-50 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                <p className="mb-2 text-sm text-slate-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                <p className="text-xs text-slate-400">WAV, MP3, MP4, WEBM</p>
              </div>
              <input type="file" className="hidden" accept="audio/*,video/*" onChange={handleFileChange} />
            </label>
          </div>
        )}

        {audioURL && (
          <div className="mt-6 w-full max-w-md flex flex-col items-center">
            <div className="flex items-center space-x-2 text-slate-700 mb-3 bg-blue-50 px-4 py-2 rounded-full border border-blue-100">
              <FileAudio size={18} className="text-blue-600" />
              <span className="text-sm font-medium truncate max-w-[200px]">{file?.name || 'Audio ready'}</span>
            </div>
            <audio src={audioURL} controls className="w-full" />
            
            <button
              onClick={handleTranscribe}
              disabled={loading}
              className="mt-6 w-full flex items-center justify-center px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={20} />
                  Transcribing...
                </>
              ) : (
                'Transcribe Audio'
              )}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 mb-6 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {transcription && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-800">Transcription Result</h2>
          </div>
          <div className="p-6 prose prose-slate max-w-none">
            <p className="whitespace-pre-wrap">{transcription}</p>
          </div>
        </div>
      )}
    </div>
  );
}
