import { useState, useCallback } from "react";
import { useBoardStore } from "../../stores/boardStore";
import { scrapeUrl, createManualItem } from "../../utils/scraper";

export function AddItemModal() {
  const { isAddItemModalOpen, setAddItemModalOpen, addItem, isLoading, setLoading } =
    useBoardStore();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"url" | "manual">("url");
  const [manualTitle, setManualTitle] = useState("");
  const [manualImage, setManualImage] = useState("");
  const [manualPrice, setManualPrice] = useState("");

  const handleClose = useCallback(() => {
    setAddItemModalOpen(false);
    setUrl("");
    setError("");
    setManualTitle("");
    setManualImage("");
    setManualPrice("");
  }, [setAddItemModalOpen]);

  const handleSubmitUrl = useCallback(async () => {
    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    try {
      new URL(url);
    } catch {
      setError("Please enter a valid URL");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const data = await scrapeUrl(url.trim());
      const position = {
        x: 100 + Math.random() * 200,
        y: 100 + Math.random() * 200,
      };
      addItem(data, url.trim(), position);
      handleClose();
    } catch {
      setError("Failed to fetch product details. Try adding manually.");
    } finally {
      setLoading(false);
    }
  }, [url, addItem, handleClose, setLoading]);

  const handleSubmitManual = useCallback(() => {
    if (!manualTitle.trim()) {
      setError("Please enter a title");
      return;
    }

    const data = createManualItem(
      manualTitle.trim(),
      manualImage.trim(),
      manualPrice.trim() || "No price"
    );
    const position = {
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200,
    };
    addItem(data, manualImage.trim() || "#", position);
    handleClose();
  }, [manualTitle, manualImage, manualPrice, addItem, handleClose]);

  if (!isAddItemModalOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100]"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              Add Clothing Item
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Mode toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5 mb-4">
            <button
              onClick={() => { setMode("url"); setError(""); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                mode === "url"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Paste URL
            </button>
            <button
              onClick={() => { setMode("manual"); setError(""); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                mode === "manual"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Add Manually
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 pb-6">
          {mode === "url" ? (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Product URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.zara.com/us/en/product..."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSubmitUrl();
                  }}
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  Supports most major retailers. We'll extract the product
                  image, title, and price.
                </p>
              </div>

              {error && (
                <p className="text-sm text-red-500 mb-3">{error}</p>
              )}

              <button
                onClick={handleSubmitUrl}
                disabled={isLoading}
                className="w-full py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Fetching details...
                  </>
                ) : (
                  "Add to Board"
                )}
              </button>
            </>
          ) : (
            <>
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    placeholder="Blue Denim Jacket"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Image URL
                  </label>
                  <input
                    type="url"
                    value={manualImage}
                    onChange={(e) => setManualImage(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price
                  </label>
                  <input
                    type="text"
                    value={manualPrice}
                    onChange={(e) => setManualPrice(e.target.value)}
                    placeholder="$49.99"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-500 mb-3">{error}</p>
              )}

              <button
                onClick={handleSubmitManual}
                className="w-full py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                Add to Board
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
