import React from 'react';

interface ProOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAcceptOffer: () => void;
  offer: {
    discountPercentage: number;
    annualDiscount: number;
    couponCode: string;
    validUntil: string;
  };
}

const ProOfferModal: React.FC<ProOfferModalProps> = ({ 
  isOpen, 
  onClose, 
  onAcceptOffer, 
  offer 
}) => {
  if (!isOpen) return null;

  const validUntil = new Date(offer.validUntil);
  const daysLeft = Math.ceil((validUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-2xl w-full shadow-2xl">
        <div className="text-center">
          {/* Header */}
          <div className="mb-6">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome to ChatPye!
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Get <span className="font-bold text-blue-600">{offer.discountPercentage}% off</span> Pro for the next {daysLeft} days
            </p>
          </div>

          {/* Offer Details */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-center space-x-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">Monthly</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Billed monthly</div>
              </div>
              <div className="text-gray-400">vs</div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">Annual</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Best value</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border-2 border-blue-200 dark:border-blue-700">
                <div className="text-3xl font-bold text-blue-600">$15.99</div>
                <div className="text-sm text-gray-500 line-through">$19.99</div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">per month</div>
                <div className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded mt-2">
                  {offer.discountPercentage}% OFF
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border-2 border-green-200 dark:border-green-700 relative">
                <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                  BEST
                </div>
                <div className="text-3xl font-bold text-green-600">$11.99</div>
                <div className="text-sm text-gray-500 line-through">$19.99</div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">per month</div>
                <div className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded mt-2">
                  {offer.annualDiscount}% OFF
                </div>
              </div>
            </div>
          </div>

          {/* Pro Benefits */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              What you get with Pro:
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✅</span>
                <span className="text-gray-700 dark:text-gray-300">Unlimited video processing</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✅</span>
                <span className="text-gray-700 dark:text-gray-300">Unlimited questions</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✅</span>
                <span className="text-gray-700 dark:text-gray-300">Advanced AI models (Claude, GPT-4)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✅</span>
                <span className="text-gray-700 dark:text-gray-300">Export to PDF/Word</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✅</span>
                <span className="text-gray-700 dark:text-gray-300">Priority support</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✅</span>
                <span className="text-gray-700 dark:text-gray-300">Advanced sharing features</span>
              </div>
            </div>
          </div>

          {/* Coupon Code */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Use coupon code at checkout:
            </div>
            <div className="bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-3">
              <code className="text-lg font-mono font-bold text-blue-600 dark:text-blue-400">
                {offer.couponCode}
              </code>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onAcceptOffer}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-lg transition-all transform hover:scale-105"
            >
              🚀 Start Pro Trial - {offer.discountPercentage}% Off
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium py-4 px-6 rounded-lg transition-colors"
            >
              Maybe Later
            </button>
          </div>

          {/* Fine Print */}
          <div className="mt-6 text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <div>Offer expires in {daysLeft} days</div>
            <div>30-day money-back guarantee</div>
            <div>Cancel anytime</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProOfferModal;
