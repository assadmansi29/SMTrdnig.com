import React, { useState } from 'react';
import { 
  X, 
  ShoppingBag, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  Star, 
  Download, 
  CreditCard, 
  Lock, 
  ArrowRight,
  Plus,
  Minus,
  Trash2,
  Filter,
  Check,
  Package,
  Layers,
  Zap,
  Tag
} from 'lucide-react';
import { BlueVerifiedBadge } from './BlueVerifiedBadge';
import { useTranslation } from '../context/LanguageContext';
import { getProductsByLanguage, LocalizedProduct } from '../data/localizedData';

type Product = LocalizedProduct;

interface ECommerceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ECommerceModal: React.FC<ECommerceModalProps> = ({ isOpen, onClose }) => {
  const { t, isRTL, language } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [isCartView, setIsCartView] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);

  const products = getProductsByLanguage(language);

  if (!isOpen) return null;

  const categoryLabels: Record<string, string> = {
    'All': t('ecomCatAll'),
    'Software & Indicators': t('ecomCatSoftware'),
    'Education & Masterclass': t('ecomCatEducation'),
    'Hardware & Merch': t('ecomCatHardware')
  };

  const filteredProducts = selectedCategory === 'All'
    ? products
    : products.filter(p => p.category === selectedCategory);

  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => {
    const currentProd = products.find(p => p.id === item.product.id) || item.product;
    return sum + currentProd.price * item.quantity;
  }, 0);
  const discount = promoApplied ? subtotal * 0.15 : 0;
  const grandTotal = Math.max(0, subtotal - discount);

  const handleAddToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(item => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as { product: Product; quantity: number }[];
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (promoCode.trim().toUpperCase() === 'ALPHA15' || promoCode.trim().toUpperCase() === 'SMTRADING') {
      setPromoApplied(true);
    }
  };

  const handleCheckout = () => {
    setCheckoutSuccess(true);
  };

  const handleReset = () => {
    setCheckoutSuccess(false);
    setIsCartView(false);
    setCart([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-[#090D17] border border-slate-800/90 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh] relative">
        
        {/* Top Header Bar */}
        <div className="p-3.5 sm:p-5 bg-[#0C1220] border-b border-slate-800 flex items-center justify-between gap-3 sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 pr-2 rtl:pr-0 rtl:pl-2">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-amber-500 p-[1px] shadow-md shadow-emerald-500/10 shrink-0">
              <div className="w-full h-full bg-[#0E1526] rounded-[11px] flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-xl font-black text-white tracking-tight truncate">
                  SMTrading <span className="text-emerald-400">{t('ecomStore')}</span>
                </h2>
                <div className="hidden sm:inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-mono-num font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  <ShieldCheck className="w-3 h-3" />
                  <span>{t('ecomOfficialDesk')}</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 truncate">
                {t('ecomSubtitle')}
              </p>
            </div>
          </div>

          {/* Right Actions: Cart Toggle & Close */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => setIsCartView(!isCartView)}
              className={`relative flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                isCartView 
                  ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md' 
                  : 'bg-[#0E1526] hover:bg-slate-800 text-slate-200 border-slate-700/80'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">{isCartView ? t('ecomBackToStore') : t('ecomViewCart')}</span>
              {totalItemsCount > 0 && (
                <span className={`font-mono-num font-extrabold text-[10px] px-1.5 py-0.2 rounded-full ${
                  isCartView ? 'bg-slate-950 text-amber-300' : 'bg-emerald-400 text-slate-950'
                }`}>
                  {totalItemsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="min-w-[42px] min-h-[42px] w-11 h-11 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:bg-slate-650 border border-slate-700/80 hover:border-slate-600 text-slate-200 hover:text-white flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Close Store"
              aria-label="Close Store"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {checkoutSuccess ? (
            /* Checkout Success State */
            <div className="p-8 sm:p-12 text-center space-y-5 max-w-lg mx-auto bg-[#0C1220] rounded-2xl border border-emerald-500/40 shadow-xl my-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="font-extrabold text-2xl text-white">{t('ecomOrderConfirmed')}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {t('ecomOrderConfirmedSub')}
                </p>
              </div>

              <div className="bg-[#070A10] p-4 rounded-xl border border-slate-800 text-left rtl:text-right text-xs font-mono-num space-y-1.5">
                <div className="flex justify-between text-slate-400">
                  <span>{t('ecomTxHash')}:</span>
                  <span className="text-emerald-400 font-bold">#SMT-{Math.floor(100000 + Math.random() * 900000)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>{t('ecomLicenseTier')}:</span>
                  <span className="text-white">{t('ecomLicenseTierVal')}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>{t('ecomDeliveryStatus')}:</span>
                  <span className="text-emerald-400">{t('ecomInstantDownload')}</span>
                </div>
              </div>

              <div className="flex gap-3 justify-center pt-2">
                <button
                  onClick={handleReset}
                  className="px-6 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md"
                >
                  {t('ecomContinueShopping')}
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  {t('ecomReturnTerminal')}
                </button>
              </div>
            </div>
          ) : isCartView ? (
            /* Cart & Checkout View */
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-emerald-400" />
                  {t('ecomYourCart')} ({totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'})
                </h3>
                <button
                  onClick={() => setIsCartView(false)}
                  className="text-xs text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
                >
                  {isRTL ? '← ' : '← '}{t('ecomBrowseMore')}
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="bg-[#0C1220] border border-slate-800 rounded-2xl p-12 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-slate-800/80 text-slate-500 flex items-center justify-center mx-auto">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-white text-base">{t('ecomCartEmpty')}</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {t('ecomCartEmptySub')}
                  </p>
                  <button
                    onClick={() => setIsCartView(false)}
                    className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md"
                  >
                    {t('ecomExploreStore')}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Cart Items List (8 cols) */}
                  <div className="lg:col-span-8 space-y-3">
                    {cart.map(({ product, quantity }) => {
                      const currentProd = products.find(p => p.id === product.id) || product;
                      return (
                      <div
                        key={product.id}
                        className="bg-[#0C1220] border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between"
                      >
                        <div className="flex items-center gap-3.5">
                          <img
                            src={currentProd.image}
                            alt={currentProd.name}
                            referrerPolicy="no-referrer"
                            className="w-16 h-16 rounded-lg object-cover border border-slate-700 shrink-0"
                          />
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono-num font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.2 rounded border border-emerald-500/20">
                                {categoryLabels[currentProd.category] || currentProd.category}
                              </span>
                              {currentProd.isDigital && (
                                <span className="text-[10px] text-cyan-300 font-mono-num">{t('ecomInstantDigital')}</span>
                              )}
                            </div>
                            <h4 className="font-bold text-xs sm:text-sm text-white line-clamp-1">
                              {currentProd.name}
                            </h4>
                            <div className="text-xs font-mono-num font-bold text-amber-300">
                              ${currentProd.price} USD
                            </div>
                          </div>
                        </div>

                        {/* Quantity Controls & Remove */}
                        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                          <div className="flex items-center bg-[#070A10] border border-slate-800 rounded-lg p-1">
                            <button
                              onClick={() => handleUpdateQuantity(product.id, -1)}
                              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="px-3 text-xs font-mono-num font-bold text-white">
                              {quantity}
                            </span>
                            <button
                              onClick={() => handleUpdateQuantity(product.id, 1)}
                              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <span className="text-sm font-mono-num font-extrabold text-white min-w-[70px] text-right rtl:text-left">
                            ${currentProd.price * quantity}
                          </span>

                          <button
                            onClick={() => handleRemoveFromCart(product.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  </div>

                  {/* Order Summary & Checkout (4 cols) */}
                  <div className="lg:col-span-4 bg-[#0C1220] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
                    <h4 className="font-extrabold text-sm text-white uppercase tracking-wider border-b border-slate-800 pb-3">
                      {t('ecomOrderBreakdown')}
                    </h4>

                    {/* Promo Code Form */}
                    <form onSubmit={handleApplyPromo} className="flex gap-2">
                      <input
                        type="text"
                        placeholder={t('ecomPromoPlaceholder')}
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        className="flex-1 bg-[#070A10] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white uppercase placeholder:normal-case focus:border-amber-400 focus:outline-none font-mono-num"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                      >
                        {t('ecomApply')}
                      </button>
                    </form>

                    {promoApplied && (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/30">
                        <Check className="w-3.5 h-3.5" />
                        <span>{t('ecomDiscountApplied')}</span>
                      </div>
                    )}

                    <div className="space-y-2 text-xs font-mono-num border-t border-slate-800/80 pt-3">
                      <div className="flex justify-between text-slate-400">
                        <span>{t('ecomSubtotal')}:</span>
                        <span className="text-white">${subtotal.toFixed(2)} USD</span>
                      </div>
                      {promoApplied && (
                        <div className="flex justify-between text-emerald-400 font-bold">
                          <span>{t('ecomDiscount')} (15%):</span>
                          <span>-${discount.toFixed(2)} USD</span>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-400">
                        <span>{t('ecomTaxDelivery')}:</span>
                        <span className="text-emerald-400 font-bold">{t('ecomFree')}</span>
                      </div>
                      <div className="flex justify-between text-base font-extrabold text-white border-t border-slate-800 pt-2">
                        <span>{t('ecomTotal')}:</span>
                        <span className="text-amber-400">${grandTotal.toFixed(2)} USD</span>
                      </div>
                    </div>

                    <button
                      onClick={handleCheckout}
                      className="w-full py-3 bg-gradient-to-r from-emerald-500 via-emerald-600 to-amber-500 hover:from-emerald-400 hover:to-amber-400 text-slate-950 font-extrabold text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Lock className="w-4 h-4" />
                      <span>{t('ecomCompleteCheckout')} (${grandTotal.toFixed(2)})</span>
                    </button>

                    <div className="flex items-center justify-center gap-4 text-[10px] text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        <Lock className="w-3 h-3 text-emerald-400" />
                        {t('ecomSslEncrypted')}
                      </span>
                      <span>•</span>
                      <span>{t('ecomPaymentMethods')}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Products Showcase View */
            <div className="space-y-6">
              
              {/* Category Filter Pills & Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0C1220] p-3 rounded-xl border border-slate-800">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {['All', 'Software & Indicators', 'Education & Masterclass', 'Hardware & Merch'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-emerald-400 text-slate-950 font-bold shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      }`}
                    >
                      {categoryLabels[cat] || cat}
                    </button>
                  ))}
                </div>

                <div className="hidden md:flex items-center gap-2 text-xs font-mono-num text-amber-300 bg-amber-400/10 px-2.5 py-1 rounded-md border border-amber-400/20">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t('ecomUseCode')}: <strong>ALPHA15</strong> (15%)</span>
                </div>
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredProducts.map(product => {
                  const isInCart = cart.some(item => item.product.id === product.id);
                  return (
                    <div
                      key={product.id}
                      className="bg-[#0C1220] border border-slate-800/90 rounded-2xl overflow-hidden hover:border-emerald-500/40 transition-all duration-300 flex flex-col group shadow-lg"
                    >
                      {/* Product Image & Badges */}
                      <div className="relative h-44 overflow-hidden bg-slate-950">
                        <img
                          src={product.image}
                          alt={product.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0C1220] via-transparent to-black/40"></div>

                        {/* Top Badges */}
                        <div className="absolute top-3 left-3 rtl:left-auto rtl:right-3 flex items-center gap-1.5">
                          {product.badge && (
                            <span className="bg-amber-400 text-slate-950 font-mono-num font-extrabold text-[9px] px-2 py-0.5 rounded shadow-md tracking-wider">
                              {product.badge}
                            </span>
                          )}
                          <span className="bg-[#070A10]/90 backdrop-blur-md text-emerald-300 font-mono-num text-[10px] px-2 py-0.5 rounded border border-emerald-500/30">
                            {categoryLabels[product.category] || product.category}
                          </span>
                        </div>

                        {/* Rating */}
                        <div className="absolute bottom-2.5 left-3 rtl:left-auto rtl:right-3 flex items-center gap-1 text-[11px] font-mono-num font-bold text-amber-300 bg-slate-950/80 px-2 py-0.5 rounded backdrop-blur-sm border border-slate-800">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>{product.rating}</span>
                          <span className="text-slate-500 font-normal">({product.reviewsCount})</span>
                        </div>
                      </div>

                      {/* Content Info */}
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                          <h3 className="font-bold text-sm text-white line-clamp-2 group-hover:text-amber-300 transition-colors leading-snug">
                            {product.name}
                          </h3>
                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                            {product.description}
                          </p>

                          {/* Key Feature Bullets */}
                          <div className="space-y-1 pt-1 border-t border-slate-800/80">
                            {product.features.slice(0, 2).map((feat, i) => (
                              <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                                <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                                <span className="line-clamp-1">{feat}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Pricing & CTA Button */}
                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3">
                          <div>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-base sm:text-lg font-extrabold text-amber-400 font-mono-num">
                                ${product.price}
                              </span>
                              {product.originalPrice && (
                                <span className="text-xs text-slate-500 line-through font-mono-num">
                                  ${product.originalPrice}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 block">{t('ecomUsdOneTime')}</span>
                          </div>

                          <button
                            onClick={() => handleAddToCart(product)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md ${
                              isInCart
                                ? 'bg-emerald-400 text-slate-950 hover:bg-emerald-300'
                                : 'bg-gradient-to-r from-emerald-500 to-amber-500 hover:from-emerald-400 hover:to-amber-400 text-slate-950'
                            }`}
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>{isInCart ? t('ecomAddedToCart') : t('ecomAddToCart')}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Guarantee Bar */}
        <div className="p-3 bg-[#070A10] border-t border-slate-800 px-4 sm:px-6 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2 shrink-0">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1 text-slate-300 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              {t('ecomGuarantees')}
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono-num text-[10px] text-amber-400">
            <span>SMTrading.pro {t('brandBy')}</span>
            <BlueVerifiedBadge size="xs" />
          </div>
        </div>
      </div>
    </div>
  );
};
