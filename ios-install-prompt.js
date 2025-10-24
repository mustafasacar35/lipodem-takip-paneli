// iOS için "Ana Ekrana Ekle" rehberi
(function() {
  'use strict';

  // iOS Safari kontrolü
  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }

  // Safari kontrolü
  function isSafari() {
    return /Safari/.test(navigator.userAgent) && !/Chrome|CriOS|FxiOS/.test(navigator.userAgent);
  }

  // Standalone modda mı? (Ana ekrana eklenmiş mi?)
  function isInStandaloneMode() {
    return ('standalone' in window.navigator) && (window.navigator.standalone);
  }

  // Daha önce gösterildi mi kontrolü
  function hasSeenPrompt() {
    return localStorage.getItem('ios-install-prompt-seen') === 'true';
  }

  // Prompt'u göster
  function showInstallPrompt() {
    // Modal HTML'i oluştur
    const modal = document.createElement('div');
    modal.id = 'ios-install-prompt';
    modal.innerHTML = `
      <style>
        #ios-install-prompt {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          box-shadow: 0 -4px 20px rgba(0,0,0,0.3);
          z-index: 999999;
          animation: slideUp 0.3s ease-out;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        
        #ios-install-prompt .prompt-content {
          max-width: 500px;
          margin: 0 auto;
        }
        
        #ios-install-prompt h3 {
          margin: 0 0 12px 0;
          font-size: 18px;
          font-weight: 600;
        }
        
        #ios-install-prompt p {
          margin: 0 0 15px 0;
          font-size: 14px;
          line-height: 1.5;
          opacity: 0.95;
        }
        
        #ios-install-prompt .steps {
          background: rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 15px;
        }
        
        #ios-install-prompt .step {
          display: flex;
          align-items: center;
          margin-bottom: 8px;
          font-size: 13px;
        }
        
        #ios-install-prompt .step:last-child {
          margin-bottom: 0;
        }
        
        #ios-install-prompt .step-icon {
          width: 24px;
          height: 24px;
          margin-right: 10px;
          background: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: #667eea;
          flex-shrink: 0;
        }
        
        #ios-install-prompt .buttons {
          display: flex;
          gap: 10px;
          margin-top: 15px;
        }
        
        #ios-install-prompt button {
          flex: 1;
          padding: 12px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        #ios-install-prompt .btn-close {
          background: rgba(255,255,255,0.2);
          color: white;
        }
        
        #ios-install-prompt .btn-close:active {
          background: rgba(255,255,255,0.3);
        }
        
        #ios-install-prompt .btn-primary {
          background: white;
          color: #667eea;
        }
        
        #ios-install-prompt .btn-primary:active {
          background: rgba(255,255,255,0.9);
        }
        
        #ios-install-prompt .share-icon {
          display: inline-block;
          font-size: 18px;
          vertical-align: middle;
          margin: 0 4px;
        }
      </style>
      <div class="prompt-content">
        <h3>📱 Ana Ekrana Ekle</h3>
        <p>Bu uygulamayı ana ekranınıza ekleyerek daha hızlı erişebilirsiniz!</p>
        
        <div class="steps">
          <div class="step">
            <span class="step-icon">1</span>
            <span>Aşağıdaki <span class="share-icon">⬆️📤</span> Paylaş butonuna dokunun</span>
          </div>
          <div class="step">
            <span class="step-icon">2</span>
            <span>"Ana Ekrana Ekle" seçeneğini bulun</span>
          </div>
          <div class="step">
            <span class="step-icon">3</span>
            <span>"Ekle" butonuna dokunun</span>
          </div>
        </div>
        
        <div class="buttons">
          <button class="btn-close" id="ios-prompt-close">Daha Sonra</button>
          <button class="btn-primary" id="ios-prompt-understand">Anladım</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listener'lar
    document.getElementById('ios-prompt-close').addEventListener('click', () => {
      closePrompt(modal);
    });
    
    document.getElementById('ios-prompt-understand').addEventListener('click', () => {
      localStorage.setItem('ios-install-prompt-seen', 'true');
      closePrompt(modal);
    });
  }
  
  function closePrompt(modal) {
    modal.style.animation = 'slideDown 0.3s ease-in';
    setTimeout(() => {
      modal.remove();
    }, 300);
  }
  
  // Ana kontrol fonksiyonu
  function init() {
    // iOS Safari'de ve standalone modda değilse ve daha önce görülmediyse göster
    if (isIOS() && isSafari() && !isInStandaloneMode() && !hasSeenPrompt()) {
      // Sayfanın yüklenmesinden 2 saniye sonra göster
      setTimeout(showInstallPrompt, 2000);
    }
  }
  
  // Sayfa yüklendiğinde başlat
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // Slidedown animasyonu ekle
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideDown {
      from {
        transform: translateY(0);
      }
      to {
        transform: translateY(100%);
      }
    }
  `;
  document.head.appendChild(style);
  
})();
