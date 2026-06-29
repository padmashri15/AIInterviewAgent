import React, { useEffect, useRef, useState } from "react";

export default function CandidateImageCapture({ loginData, onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [capturedImage, setCapturedImage] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
  startCamera();

  return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" }
      });

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
    } catch (err) {
      setError("Camera permission denied or not available.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    const size = 300;
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const square = Math.min(vw, vh);

    const sx = (vw - square) / 2;
    const sy = (vh - square) / 2;

    ctx.drawImage(video, sx, sy, square, square, 0, 0, size, size);

    const imageData = canvas.toDataURL("image/png");
    setCapturedImage(imageData);

    stopCamera();
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleContinue = () => {
    // Send image back to index.js
    try {
      if (capturedImage) {
        // persist so feedback screen can read it
        localStorage.setItem('candidateImage', capturedImage);
      }
    } catch (e) {
      // ignore storage errors
    }
    if (onCapture) onCapture(capturedImage);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f1f0fc] via-[#eaeefa] to-[#e1edf9] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md text-center">
        <h2 className="text-2xl font-bold mb-2">Capture Candidate Image</h2>
        <p className="text-gray-600 mb-4">
          Align your face inside the frame
        </p>

        {error && <p className="text-red-600 mb-4">{error}</p>}

        <div className="relative w-full h-80 bg-black rounded-xl overflow-hidden flex items-center justify-center">
          
          {!capturedImage && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="absolute w-full h-full object-cover"
            />
          )}

          {!capturedImage && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-64 rounded-full border-4 border-white shadow-xl"></div>
              <div className="absolute inset-0 bg-black opacity-40"></div>
            </div>
          )}

          {capturedImage && (
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-full object-cover"
            />
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <div className="mt-6 space-y-3">
          {!capturedImage && (
            <button
              onClick={handleCapture}
              className="w-full bg-[#5f1fbe] text-white py-3 rounded-xl hover:bg-[#4a1696] transition-all font-semibold"
            >
              Capture
            </button>
          )}

          {capturedImage && (
            <>
              <button
                onClick={handleRetake}
                className="w-full bg-gray-200 text-gray-800 py-3 rounded-xl hover:bg-gray-300 transition-all font-semibold"
              >
                Retake
              </button>

              <button
                onClick={handleContinue}
                className="w-full bg-[#5f1fbe] text-white py-3 rounded-xl hover:bg-[#4a1696] transition-all font-semibold"
              >
                Continue
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}