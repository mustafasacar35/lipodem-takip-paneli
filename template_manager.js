/**
 * Template Manager - Shared library for template loading/saving with index-based lazy loading
 * Supports 500+ templates by splitting into individual files
 * 
 * Architecture:
 * - templates/index.json: Metadata for all templates (15 KB for 500 templates)
 * - templates/day_XXX.json: Individual template files (25 KB each)
 * 
 * Features:
 * - Index caching (avoid repeated API calls)
 * - Template caching (Map + localStorage)
 * - Parallel template loading
 * - Individual template save/delete (admin only, requires token)
 * - GitHub API integration
 * 
 * Loading Strategy:
 * - READ (patients): raw.githubusercontent.com (no rate limit, no token needed, UTF-8 safe)
 * - WRITE (admins): GitHub API (requires token)
 */

const TemplateManager = {
    // Configuration
    config: {
        owner: 'mustafasacar35',
        repo: 'lipodem-takip-paneli',
        branch: 'main',
        indexPath: 'templates/index.json',
        templatePath: 'templates/',
        cacheKey: 'templateManagerCache',
        indexCacheKey: 'templateIndexCache',
        githubToken: null // Will be set via configure()
    },

    // Cache
    indexCache: null,
    templateCache: new Map(),
    
    // MUTEX for index updates (prevent race conditions)
    indexUpdateMutex: null,
    indexUpdateQueue: [],
    
    /**
     * Configure TemplateManager with GitHub credentials
     * @param {Object} options - Configuration options
     * @param {string} options.githubToken - GitHub personal access token
     * @param {string} [options.owner] - Repository owner (optional)
     * @param {string} [options.repo] - Repository name (optional)
     */
    configure(options) {
        if (options.githubToken) {
            this.config.githubToken = options.githubToken;
        }
        if (options.owner) {
            this.config.owner = options.owner;
        }
        if (options.repo) {
            this.config.repo = options.repo;
        }
        console.log('[TemplateManager] Configured with token:', this.config.githubToken ? '✅ Present' : '❌ Missing');
    },
    
    /**
     * Acquire mutex lock for index updates (prevents race conditions)
     * Returns a promise that resolves when lock is acquired
     */
    async acquireIndexLock() {
        // If no lock exists, acquire immediately
        if (!this.indexUpdateMutex) {
            this.indexUpdateMutex = Promise.resolve();
            return;
        }
        
        // Wait for current operation to finish
        await this.indexUpdateMutex;
    },
    
    /**
     * Release mutex lock after index update
     */
    releaseIndexLock() {
        this.indexUpdateMutex = null;
    },
    
    /**
     * Load template index from GitHub
     * Index contains metadata: id, name, dietType, totalMacros, filename
     * Returns: { version: "1.0", totalCount: 500, templates: [...metadata...] }
     * @param {string} token - GitHub token (optional)
     * @param {boolean} forceRefresh - Skip cache and fetch from GitHub (default: false)
     */
    async loadIndex(token, forceRefresh = false) {
        try {
            // Check memory cache first (skip if forceRefresh)
            if (!forceRefresh && this.indexCache) {
                console.log('[TemplateManager] Index loaded from memory cache');
                return this.indexCache;
            }

            // Check localStorage cache (skip if forceRefresh)
            if (!forceRefresh) {
                const cachedIndex = localStorage.getItem(this.config.indexCacheKey);
                if (cachedIndex) {
                    try {
                        const parsed = JSON.parse(cachedIndex);
                        this.indexCache = parsed;
                        console.log('[TemplateManager] Index loaded from localStorage:', parsed.totalCount, 'templates');
                        return parsed;
                    } catch (e) {
                        console.warn('[TemplateManager] Failed to parse cached index:', e);
                        localStorage.removeItem(this.config.indexCacheKey);
                    }
                }
            }

            // Fetch from GitHub
            console.log('[TemplateManager] Fetching index from GitHub...', forceRefresh ? '(FORCE REFRESH)' : '');
            
            let index;
            
            if (forceRefresh && token) {
                // FORCE REFRESH: Use GitHub API with token (bypasses ALL caches!)
                const apiUrl = `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/${this.config.indexPath}?ref=${this.config.branch}&_=${Date.now()}`;
                
                const apiResponse = await fetch(apiUrl, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });

                if (!apiResponse.ok) {
                    if (apiResponse.status === 404) {
                        console.warn('[TemplateManager] Index not found, returning empty structure');
                        const emptyIndex = { version: '1.0', totalCount: 0, templates: [] };
                        this.indexCache = emptyIndex;
                        return emptyIndex;
                    }
                    throw new Error(`Failed to load index via API: ${apiResponse.status}`);
                }

                const fileData = await apiResponse.json();
                
                // Decode base64 content (UTF-8 safe)
                let content;
                try {
                    // Browser environment: use atob
                    content = decodeURIComponent(escape(atob(fileData.content.replace(/\s/g, ''))));
                } catch (e) {
                    // Fallback: Node.js environment
                    content = Buffer.from(fileData.content, 'base64').toString('utf8');
                }
                
                index = JSON.parse(content);
                console.log('[TemplateManager] Index loaded via GitHub API (fresh):', index.totalCount, 'templates');
                
            } else {
                // Normal fetch: Use raw.githubusercontent.com (faster, but cached)
                const rawUrl = `https://raw.githubusercontent.com/${this.config.owner}/${this.config.repo}/${this.config.branch}/${this.config.indexPath}?t=${Date.now()}`;
                
                // 🔥 CACHE BYPASS: Sadece cache:'no-store' kullan (CORS preflight engellemek için header yok)
                const response = await fetch(rawUrl, {
                    cache: 'no-store'
                });

                if (!response.ok) {
                    if (response.status === 404) {
                        console.warn('[TemplateManager] Index not found, returning empty structure');
                        const emptyIndex = { version: '1.0', totalCount: 0, templates: [] };
                        this.indexCache = emptyIndex;
                        return emptyIndex;
                    }
                    throw new Error(`Failed to load index: ${response.status} ${response.statusText}`);
                }

                index = await response.json();
                console.log('[TemplateManager] Index loaded from GitHub:', index.totalCount, 'templates');
            }

            // Cache in memory and localStorage
            this.indexCache = index;
            localStorage.setItem(this.config.indexCacheKey, JSON.stringify(index));

            console.log('[TemplateManager] Index loaded from GitHub:', index.totalCount, 'templates');
            return index;

        } catch (error) {
            console.error('[TemplateManager] Error loading index:', error);
            throw error;
        }
    },

    /**
     * Load single template by filename
     * Returns: Full template object with all details
     */
    async loadTemplate(filename, token) {
        try {
            // Check memory cache first
            if (this.templateCache.has(filename)) {
                console.log('[TemplateManager] Template loaded from memory cache:', filename);
                return this.templateCache.get(filename);
            }

            // 🔥 CACHE DISABLED: localStorage quota exceeded with 1000+ templates
            // Now only using in-memory cache (Map) to avoid quota errors
            
            // Fetch from GitHub - Use raw.githubusercontent.com for public repos (no rate limit!)
            console.log('[TemplateManager] Fetching template from GitHub:', filename);
            const url = `https://raw.githubusercontent.com/${this.config.owner}/${this.config.repo}/${this.config.branch}/${this.config.templatePath}${filename}?t=${Date.now()}`;
            
            // 🔥 CACHE BYPASS: Sadece cache:'no-store' kullan (CORS preflight engellemek için header yok)
            const response = await fetch(url, {
                cache: 'no-store'
            });

            if (!response.ok) {
                throw new Error(`Failed to load template ${filename}: ${response.status} ${response.statusText}`);
            }

            // Direct JSON parse - raw.githubusercontent.com returns JSON directly (with proper UTF-8!)
            const template = await response.json();
            
            // 🔍 DEBUG: Template yapısını kontrol et
            console.log('[TemplateManager] Template loaded:', {
                filename,
                id: template.id,
                name: template.name,
                hasOgunler: !!template.ogunler,
                ogunlerCount: template.ogunler?.length,
                keys: Object.keys(template).slice(0, 10) // İlk 10 key
            });

            // Cache ONLY in memory (not localStorage - quota exceeded!)
            this.templateCache.set(filename, template);

            console.log('[TemplateManager] Template cached in memory:', filename);
            return template;

        } catch (error) {
            console.error('[TemplateManager] Error loading template:', filename, error);
            throw error;
        }
    },

    /**
     * Load multiple templates in parallel with batching (prevents rate limiting)
     * Returns: Array of template objects in same order as filenames
     * @param {number} batchSize - Number of templates to load simultaneously (default: 50)
     */
    async loadTemplates(filenames, token, batchSize = 100) {
        try {
            console.log('[TemplateManager] Loading', filenames.length, 'templates in batches of', batchSize, '...');
            
            const allTemplates = [];
            const failedTemplates = [];
            
            // Split into batches to prevent rate limiting and browser connection limits
            for (let i = 0; i < filenames.length; i += batchSize) {
                const batch = filenames.slice(i, i + batchSize);
                console.log(`[TemplateManager] Loading batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(filenames.length / batchSize)} (${batch.length} templates)...`);
                
                // Load templates with error handling - don't fail entire batch on single error
                const promises = batch.map(async filename => {
                    try {
                        return await this.loadTemplate(filename, token);
                    } catch (error) {
                        console.warn(`[TemplateManager] Skipping failed template: ${filename} (${error.message})`);
                        failedTemplates.push(filename);
                        return null; // Return null for failed templates
                    }
                });
                
                const batchTemplates = await Promise.all(promises);
                
                // Filter out null values (failed templates)
                const successfulTemplates = batchTemplates.filter(t => t !== null);
                allTemplates.push(...successfulTemplates);
                
                console.log(`[TemplateManager] Batch ${Math.floor(i / batchSize) + 1} completed (${allTemplates.length}/${filenames.length} total, ${failedTemplates.length} failed)`);
            }
            
            if (failedTemplates.length > 0) {
                console.warn(`[TemplateManager] ⚠️ ${failedTemplates.length} templates could not be loaded:`, failedTemplates.slice(0, 10));
            }
            
            console.log('[TemplateManager] ✅ Loaded', allTemplates.length, 'templates successfully');
            return allTemplates;
        } catch (error) {
            console.error('[TemplateManager] Error loading multiple templates:', error);
            throw error;
        }
    },

    /**
     * Save individual template to GitHub
     * Also updates index with metadata
     */
    async saveTemplate(template, token) {
        try {
            // Use token from parameter, or fall back to config
            const githubToken = token || this.config.githubToken;
            
            if (!githubToken) {
                console.error('[TemplateManager] No token available. Config:', this.config);
                throw new Error('GitHub token required for saving templates');
            }

            // Generate filename if not exists
            if (!template.filename) {
                // CRITICAL FIX: Use template ID timestamp for unique filename
                // Extract timestamp from template.id (e.g., day_1759090703624_abc -> 1759090703624)
                const timestampMatch = template.id.match(/day_(\d+)_/);
                if (timestampMatch) {
                    const timestamp = timestampMatch[1];
                    template.filename = `day_${timestamp}.json`;
                } else {
                    // Fallback: Use current timestamp
                    const fallbackTimestamp = Date.now();
                    template.filename = `day_${fallbackTimestamp}.json`;
                }
                console.log('[TemplateManager] Generated unique filename:', template.filename);
            }

            console.log('[TemplateManager] Saving template:', template.filename);

            // Prepare template content
            const templateContent = JSON.stringify(template, null, 2);
            const encodedContent = btoa(unescape(encodeURIComponent(templateContent)));

            // ALWAYS get the latest SHA before saving (to avoid conflicts)
            const checkUrl = `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/${this.config.templatePath}${template.filename}?ref=${this.config.branch}`;
            
            let sha = null;
            let retryCount = 0;
            const maxRetries = 3;
            
            while (retryCount < maxRetries) {
                try {
                    // Get current file SHA
                    const checkResponse = await fetch(checkUrl, {
                        headers: {
                            'Authorization': `token ${githubToken}`,
                            'Accept': 'application/vnd.github.v3+json'
                        }
                    });

                    if (checkResponse.ok) {
                        const existingFile = await checkResponse.json();
                        sha = existingFile.sha;
                        console.log('[TemplateManager] Current file SHA:', sha);
                    } else {
                        console.log('[TemplateManager] File does not exist, creating new file');
                    }

                    // Save template file
                    const saveUrl = `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/${this.config.templatePath}${template.filename}`;
                    const savePayload = {
                        message: `Update template: ${template.name} (${template.filename})`,
                        content: encodedContent,
                        branch: this.config.branch
                    };

                    if (sha) {
                        savePayload.sha = sha;
                    }

                    const saveResponse = await fetch(saveUrl, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `token ${githubToken}`,
                            'Accept': 'application/vnd.github.v3+json',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(savePayload)
                    });

                    if (!saveResponse.ok) {
                        const errorData = await saveResponse.json();
                        
                        // If SHA conflict, retry with fresh SHA
                        if (saveResponse.status === 409 && retryCount < maxRetries - 1) {
                            console.warn(`[TemplateManager] SHA conflict, retrying (${retryCount + 1}/${maxRetries})...`);
                            retryCount++;
                            await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
                            continue; // Retry loop
                        }
                        
                        throw new Error(`Failed to save template: ${errorData.message}`);
                    }

                    console.log('[TemplateManager] Template saved successfully:', template.filename);
                    break; // Success, exit retry loop
                    
                } catch (error) {
                    if (retryCount >= maxRetries - 1) {
                        throw error; // Max retries reached
                    }
                    retryCount++;
                    console.warn(`[TemplateManager] Error, retrying (${retryCount}/${maxRetries}):`, error.message);
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            // Update index
            await this.updateIndex(template, githubToken);

            // Update cache
            this.templateCache.set(template.filename, template);
            const cacheKey = `${this.config.cacheKey}_${template.filename}`;
            localStorage.setItem(cacheKey, JSON.stringify(template));

            return { success: true, filename: template.filename };

        } catch (error) {
            console.error('[TemplateManager] Error saving template:', error);
            throw error;
        }
    },

    /**
     * Update index with template metadata
     * Called after saving individual template
     * PROTECTED BY MUTEX to prevent race conditions
     */
    async updateIndex(template, token) {
        // Acquire lock (wait if another update is in progress)
        await this.acquireIndexLock();
        
        try {
            // Use token from parameter, or fall back to config
            const githubToken = token || this.config.githubToken;
            
            if (!githubToken) {
                throw new Error('GitHub token required for updating index');
            }
            
            console.log('[TemplateManager] Updating index... (MUTEX LOCKED)');

            // CRITICAL FIX 1: Clear cache FIRST to ensure fresh data
            this.indexCache = null;
            localStorage.removeItem(this.config.indexCacheKey);
            
            // CRITICAL FIX 2: Load current index with FORCE REFRESH + TOKEN
            // This ensures we get the LATEST index from GitHub API, not cached version
            const index = await this.loadIndex(githubToken, true); // forceRefresh=true + token
            
            console.log('[TemplateManager] Current index loaded, totalCount:', index.totalCount);

            // Create metadata entry
            const metadata = {
                id: template.id,
                name: template.name,
                gunAdi: template.gunAdi, // ✅ FIX: Badge system için gerekli!
                dietType: template.dietType,
                totalMacros: template.totalMacros,
                filename: template.filename
            };

            // Find and update or add new
            const existingIndex = index.templates.findIndex(t => t.id === template.id);
            if (existingIndex >= 0) {
                index.templates[existingIndex] = metadata;
            } else {
                index.templates.push(metadata);
                index.totalCount = index.templates.length;
            }

            // Save updated index
            const indexContent = JSON.stringify(index, null, 2);
            const encodedContent = btoa(unescape(encodeURIComponent(indexContent)));

            // Get current index SHA
            const checkUrl = `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/${this.config.indexPath}?ref=${this.config.branch}`;
            const checkResponse = await fetch(checkUrl, {
                headers: {
                    'Authorization': `token ${githubToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            let sha = null;
            if (checkResponse.ok) {
                const existingFile = await checkResponse.json();
                sha = existingFile.sha;
            }

            // Save index
            const saveUrl = `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/${this.config.indexPath}`;
            const savePayload = {
                message: `Update index: ${template.name} (${index.totalCount} templates)`,
                content: encodedContent,
                branch: this.config.branch
            };

            if (sha) {
                savePayload.sha = sha;
            }

            const saveResponse = await fetch(saveUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${githubToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(savePayload)
            });

            if (!saveResponse.ok) {
                const errorData = await saveResponse.json();
                throw new Error(`Failed to update index: ${errorData.message}`);
            }

            // Update cache
            this.indexCache = index;
            localStorage.setItem(this.config.indexCacheKey, JSON.stringify(index));

            console.log('[TemplateManager] Index updated successfully:', index.totalCount, 'templates (MUTEX RELEASED)');

        } catch (error) {
            console.error('[TemplateManager] Error updating index:', error);
            throw error;
        } finally {
            // ALWAYS release lock, even on error
            this.releaseIndexLock();
        }
    },

    /**
     * Delete template from GitHub
     * Also updates index
     */
    async deleteTemplate(filename, templateId, token) {
        try {
            // Use token from parameter, or fall back to config
            const githubToken = token || this.config.githubToken;
            
            if (!githubToken) {
                throw new Error('GitHub token required for deleting templates');
            }

            console.log('[TemplateManager] Deleting template:', filename);

            // Get file SHA
            const checkUrl = `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/${this.config.templatePath}${filename}?ref=${this.config.branch}`;
            const checkResponse = await fetch(checkUrl, {
                headers: {
                    'Authorization': `token ${githubToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!checkResponse.ok) {
                throw new Error(`Template not found: ${filename}`);
            }

            const fileData = await checkResponse.json();

            // Delete file
            const deleteUrl = `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/${this.config.templatePath}${filename}`;
            const deleteResponse = await fetch(deleteUrl, {
                method: 'DELETE',
                headers: {
                    'Authorization': `token ${githubToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `Delete template: ${filename}`,
                    sha: fileData.sha,
                    branch: this.config.branch
                })
            });

            if (!deleteResponse.ok) {
                const errorData = await deleteResponse.json();
                throw new Error(`Failed to delete template: ${errorData.message}`);
            }

            console.log('[TemplateManager] Template deleted successfully:', filename);

            // MUTEX LOCK: Acquire lock before updating index
            await this.acquireIndexLock();
            
            try {
                // CRITICAL FIX: Clear cache FIRST
                this.indexCache = null;
                localStorage.removeItem(this.config.indexCacheKey);
                
                // Update index - remove template (FORCE REFRESH to get latest from GitHub!)
                const index = await this.loadIndex(githubToken, true); // forceRefresh = true
                
                console.log('[TemplateManager] Current index loaded, totalCount:', index.totalCount);
                
                index.templates = index.templates.filter(t => t.id !== templateId);
                index.totalCount = index.templates.length;

                // Save updated index
                const indexContent = JSON.stringify(index, null, 2);
                const encodedContent = btoa(unescape(encodeURIComponent(indexContent)));

                const indexCheckUrl = `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/${this.config.indexPath}?ref=${this.config.branch}`;
                const indexCheckResponse = await fetch(indexCheckUrl, {
                    headers: {
                        'Authorization': `token ${githubToken}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });

                let indexSha = null;
                if (indexCheckResponse.ok) {
                    const existingIndex = await indexCheckResponse.json();
                    indexSha = existingIndex.sha;
                }

                const saveIndexUrl = `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/${this.config.indexPath}`;
                const indexSaveResponse = await fetch(saveIndexUrl, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${githubToken}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: `Update index: deleted template (${index.totalCount} templates)`,
                        content: encodedContent,
                        sha: indexSha,
                        branch: this.config.branch
                    })
                });

                if (!indexSaveResponse.ok) {
                    const errorData = await indexSaveResponse.json();
                    throw new Error(`Failed to update index after delete: ${errorData.message}`);
                }

                // Clear cache
                this.templateCache.delete(filename);
                localStorage.removeItem(`${this.config.cacheKey}_${filename}`);
                this.indexCache = index;
                localStorage.setItem(this.config.indexCacheKey, JSON.stringify(index));

                console.log('[TemplateManager] Index updated after delete:', index.totalCount, 'templates (MUTEX RELEASED)');
                
            } finally {
                // ALWAYS release lock, even on error
                this.releaseIndexLock();
            }

            return { success: true };

        } catch (error) {
            console.error('[TemplateManager] Error deleting template:', error);
            throw error;
        }
    },

    /**
     * Clear all caches (memory + localStorage)
     * @param {boolean} fullReset - If true, clears ALL template-related caches
     */
    clearCache(fullReset = false) {
        console.log('[TemplateManager] Clearing caches...', fullReset ? '(FULL RESET)' : '(STANDARD)');
        
        // Always clear index cache
        this.indexCache = null;
        localStorage.removeItem(this.config.indexCacheKey);
        
        if (fullReset) {
            // Full reset: Clear all template caches
            this.templateCache.clear();
            
            // Clear all template-related localStorage items
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith(this.config.cacheKey) || key.includes('template'))) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
            
            console.log('[TemplateManager] Full cache reset completed:', keysToRemove.length, 'items removed');
        } else {
            // Standard clear: Only clear index cache
            console.log('[TemplateManager] Index cache cleared');
        }
    },
    
    /**
     * Force refresh from GitHub (bypasses all caches)
     * Useful after save/delete operations to ensure UI reflects latest state
     */
    async forceRefresh(token) {
        console.log('[TemplateManager] Force refresh initiated...');
        this.clearCache(true); // Full cache reset
        const index = await this.loadIndex(token, true); // Force reload from GitHub
        console.log('[TemplateManager] Force refresh completed:', index.totalCount, 'templates');
        return index;
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TemplateManager;
}
