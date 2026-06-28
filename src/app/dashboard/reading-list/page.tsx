import { requireAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ReadingListPage() {
  const auth = await requireAuth();
  
  if (!auth) {
    redirect('/sign-in');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Reading List
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Your bookmarked videos and learning materials
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Bookmark cards will be loaded here */}
          <div id="bookmarks-container" className="space-y-6">
            {/* Dynamic content will be loaded by JavaScript */}
          </div>
        </div>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            async function loadBookmarks() {
              try {
                const response = await fetch('/api/bookmarks?limit=50', {
                  headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem('authToken')
                  }
                });
                
                if (response.ok) {
                  const data = await response.json();
                  renderBookmarks(data.bookmarks);
                }
              } catch (error) {
                console.error('Error loading bookmarks:', error);
              }
            }

            function renderBookmarks(bookmarks) {
              const container = document.getElementById('bookmarks-container');
              
              if (bookmarks.length === 0) {
                container.innerHTML = \`
                  <div class="col-span-full text-center py-12">
                    <div class="text-gray-400 text-6xl mb-4">📚</div>
                    <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No bookmarks yet
                    </h3>
                    <p class="text-gray-600 dark:text-gray-400">
                      Start bookmarking videos in the Chrome extension to build your reading list
                    </p>
                    <a href="https://chrome.google.com/webstore" 
                       class="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
                      Install Extension
                    </a>
                  </div>
                \`;
                return;
              }

              container.innerHTML = bookmarks.map(bookmark => \`
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div class="aspect-video bg-gray-200 dark:bg-gray-700">
                    <img src="\${bookmark.thumbnail}" 
                         alt="\${bookmark.videoTitle}"
                         class="w-full h-full object-cover">
                  </div>
                  
                  <div class="p-4">
                    <div class="flex items-start justify-between mb-2">
                      <h3 class="text-lg font-medium text-gray-900 dark:text-white line-clamp-2">
                        \${bookmark.title}
                      </h3>
                      <div class="flex items-center space-x-1 ml-2">
                        <button onclick="shareBookmark('\${bookmark.id}')" 
                                class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                title="Share">
                          🔗
                        </button>
                        <button onclick="deleteBookmark('\${bookmark.id}')" 
                                class="p-1 text-gray-400 hover:text-red-600"
                                title="Delete">
                          🗑️
                        </button>
                      </div>
                    </div>
                    
                    <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      \${bookmark.channelName}
                    </p>
                    
                    <div class="flex items-center justify-between">
                      <span class="text-sm text-blue-600 dark:text-blue-400 font-medium">
                        \${bookmark.metadata.timestampFormatted}
                      </span>
                      <button onclick="openVideo('\${bookmark.videoId}', \${bookmark.timestamp})"
                              class="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md transition-colors">
                        Watch Now
                      </button>
                    </div>
                    
                    \${bookmark.description ? \`
                      <p class="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                        \${bookmark.description}
                      </p>
                    \` : ''}
                    
                    <div class="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div class="flex items-center space-x-2">
                        \${bookmark.tags.map(tag => \`
                          <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                            \${tag}
                          </span>
                        \`).join('')}
                      </div>
                      <span class="text-xs text-gray-500 dark:text-gray-400">
                        \${new Date(bookmark.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              \`).join('');
            }

            function openVideo(videoId, timestamp) {
              const url = \`https://www.youtube.com/watch?v=\${videoId}&t=\${Math.floor(timestamp)}s\`;
              window.open(url, '_blank');
            }

            async function shareBookmark(bookmarkId) {
              try {
                const response = await fetch(\`/api/bookmarks/\${bookmarkId}/share\`, {
                  method: 'POST',
                  headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem('authToken')
                  }
                });
                
                if (response.ok) {
                  const data = await response.json();
                  await navigator.clipboard.writeText(data.shareUrl);
                  alert('Share link copied to clipboard!');
                }
              } catch (error) {
                console.error('Error sharing bookmark:', error);
              }
            }

            async function deleteBookmark(bookmarkId) {
              if (confirm('Are you sure you want to delete this bookmark?')) {
                try {
                  const response = await fetch(\`/api/bookmarks?bookmarkId=\${bookmarkId}\`, {
                    method: 'DELETE',
                    headers: {
                      'Authorization': 'Bearer ' + localStorage.getItem('authToken')
                    }
                  });
                  
                  if (response.ok) {
                    loadBookmarks(); // Reload the list
                  }
                } catch (error) {
                  console.error('Error deleting bookmark:', error);
                }
              }
            }

            // Load bookmarks when page loads
            document.addEventListener('DOMContentLoaded', loadBookmarks);
          `
        }}
      />
    </div>
  );
}
