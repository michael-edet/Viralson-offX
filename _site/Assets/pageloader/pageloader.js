// pageloader.js - Reusable across all pages
class PageLoader {
  constructor() {
    this.loaderHTML = `
            <div class="page-loader" id="pageLoader">
                <div class="vs-logo">VS</div>
                <div class="loading-lines">
                    <div class="line"></div>
                    <div class="line"></div>
                    <div class="line"></div>
                    <div class="line"></div>
                </div>
            </div>
        `;
    this.init();
  }
  
  init() {
    // Inject loader HTML at the start of body
    document.body.insertAdjacentHTML('afterbegin', this.loaderHTML);
    
    const pageLoader = document.getElementById('pageLoader');
    const body = document.body;
    
    // Add loading class to body
    body.classList.add('loading');
    
    // Wait for page to load
    window.addEventListener('load', () => {
      setTimeout(() => {
        this.hideLoader();
      }, 2000);
    });
    
    // Fallback
    setTimeout(() => {
      if (pageLoader.style.display !== 'none') {
        this.hideLoader();
      }
    }, 5000);
  }
  
  hideLoader() {
    const pageLoader = document.getElementById('pageLoader');
    const body = document.body;
    
    pageLoader.classList.add('hidden');
    body.classList.remove('loading');
    
    setTimeout(() => {
      pageLoader.style.display = 'none';
    }, 500);
  }
  
  // Method to show loader manually if needed
  showLoader() {
    const pageLoader = document.getElementById('pageLoader');
    const body = document.body;
    
    pageLoader.style.display = 'flex';
    body.classList.add('loading');
    
    setTimeout(() => {
      pageLoader.classList.remove('hidden');
    }, 10);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  new PageLoader();
});