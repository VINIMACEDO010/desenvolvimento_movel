// Service Worker para PWA da Agência Digital
const CACHE_NAME = 'agencia-digital-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/images/hero_image.jpg',
  '/images/web_development.jpeg',
  '/images/seo_image.jpg',
  '/images/seo_logo.jpg',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// Instala o Service Worker e faz cache dos recursos
self.addEventListener('install', function(event) {
  console.log('Service Worker: Instalando...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Service Worker: Cache aberto');
        return cache.addAll(urlsToCache);
      })
      .then(function() {
        console.log('Service Worker: Todos os recursos foram cacheados');
        return self.skipWaiting();
      })
      .catch(function(error) {
        console.log('Service Worker: Erro ao cachear recursos:', error);
      })
  );
});

// Ativa o Service Worker e limpa caches antigos
self.addEventListener('activate', function(event) {
  console.log('Service Worker: Ativando...');
  
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      console.log('Service Worker: Ativado e pronto para uso');
      return self.clients.claim();
    })
  );
});

// Intercepta requisições e serve do cache quando possível
self.addEventListener('fetch', function(event) {
  // Só intercepta requisições GET
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Ignora requisições para outros domínios (exceto fonts e CDNs conhecidos)
  const url = new URL(event.request.url);
  const isOwnDomain = url.origin === location.origin;
  const isFonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  const isCDN = url.hostname === 'cdnjs.cloudflare.com';
  
  if (!isOwnDomain && !isFonts && !isCDN) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Se encontrou no cache, retorna
        if (response) {
          console.log('Service Worker: Servindo do cache:', event.request.url);
          return response;
        }
        
        // Se não encontrou no cache, busca na rede
        console.log('Service Worker: Buscando na rede:', event.request.url);
        return fetch(event.request).then(function(response) {
          // Verifica se a resposta é válida
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clona a resposta para cachear
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then(function(cache) {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        });
      })
      .catch(function(error) {
        console.log('Service Worker: Erro ao buscar recurso:', error);
        
        // Se for uma requisição de navegação e falhou, retorna página offline
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
        
        // Para outros recursos, retorna erro
        return new Response('Recurso não disponível offline', {
          status: 404,
          statusText: 'Not Found'
        });
      })
  );
});

// Escuta mensagens do cliente (página web)
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Notifica sobre atualizações disponíveis
self.addEventListener('updatefound', function(event) {
  console.log('Service Worker: Nova versão disponível');
  
  // Envia mensagem para o cliente sobre a atualização
  self.clients.matchAll().then(function(clients) {
    clients.forEach(function(client) {
      client.postMessage({
        type: 'UPDATE_AVAILABLE',
        message: 'Nova versão disponível. Recarregue a página para atualizar.'
      });
    });
  });
});

// Background Sync para formulários offline
self.addEventListener('sync', function(event) {
  if (event.tag === 'contact-form-sync') {
    event.waitUntil(syncContactForm());
  }
});

// Função para sincronizar formulário de contato
function syncContactForm() {
  return new Promise(function(resolve, reject) {
    // Aqui você implementaria a lógica para enviar dados do formulário
    // que foram salvos quando o usuário estava offline
    console.log('Service Worker: Sincronizando formulário de contato...');
    
    // Simula sincronização bem-sucedida
    setTimeout(function() {
      console.log('Service Worker: Formulário sincronizado com sucesso');
      resolve();
    }, 1000);
  });
}

// Push notifications (opcional)
self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.primaryKey
      },
      actions: [
        {
          action: 'explore',
          title: 'Ver detalhes',
          icon: '/icons/icon-96x96.png'
        },
        {
          action: 'close',
          title: 'Fechar',
          icon: '/icons/icon-96x96.png'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Clique em notificações
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.action === 'explore') {
    // Abre a aplicação
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Estratégia de cache personalizada para diferentes tipos de recursos
function getCacheStrategy(request) {
  const url = new URL(request.url);
  
  // Cache First para recursos estáticos (CSS, JS, imagens)
  if (request.destination === 'style' || 
      request.destination === 'script' || 
      request.destination === 'image') {
    return 'cache-first';
  }
  
  // Network First para documentos HTML
  if (request.destination === 'document') {
    return 'network-first';
  }
  
  // Stale While Revalidate para outros recursos
  return 'stale-while-revalidate';
}

// Implementa diferentes estratégias de cache
function handleRequest(event, strategy) {
  switch (strategy) {
    case 'cache-first':
      return cacheFirst(event.request);
    case 'network-first':
      return networkFirst(event.request);
    case 'stale-while-revalidate':
      return staleWhileRevalidate(event.request);
    default:
      return fetch(event.request);
  }
}

function cacheFirst(request) {
  return caches.match(request).then(function(response) {
    return response || fetch(request);
  });
}

function networkFirst(request) {
  return fetch(request).catch(function() {
    return caches.match(request);
  });
}

function staleWhileRevalidate(request) {
  const fetchPromise = fetch(request).then(function(response) {
    const responseClone = response.clone();
    caches.open(CACHE_NAME).then(function(cache) {
      cache.put(request, responseClone);
    });
    return response;
  });
  
  return caches.match(request).then(function(response) {
    return response || fetchPromise;
  });
}

