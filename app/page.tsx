'use client';

import Image from 'next/image';
import { useEffect } from 'react';

const WASM_BINARY_PATH = '/wasm/obamify_bg.wasm';

export default function HomePage() {
  useEffect(() => {
    let disposed = false;

    async function bootWasm() {
      if (typeof window === 'undefined') {
        return;
      }

      try {
        const wasmModule = (await import(/* webpackIgnore: true */ '/wasm/obamify.js')) as {
          default?: (wasmUrl?: string) => Promise<unknown>;
        };

        if (!wasmModule?.default) {
          console.error('obamify.js missing default export.');
          return;
        }

        if (!disposed) {
          await wasmModule.default(WASM_BINARY_PATH);
        }
      } catch (error) {
        console.error('Failed to bootstrap the obamify WASM bundle', error);
      }
    }

    bootWasm();

    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if ('serviceWorker' in navigator && window.location.hash !== '#dev') {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((error) => console.error('Service worker registration failed', error));
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    function isMobileDevice() {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      ) || (!!navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
    }

    const addShareButton = () => {
      const downloadLink = document.getElementById('rfd-output') as HTMLAnchorElement | null;
      if (!downloadLink) {
        return;
      }

      const parent = downloadLink.parentElement;
      if (!parent || parent.querySelector('.share-button')) {
        return;
      }

      const rfdButtons = parent.querySelectorAll('.rfd-button');
      if (rfdButtons.length >= 2) {
        rfdButtons[0].remove();
      }

      if (!navigator.share || !isMobileDevice()) {
        return;
      }

      const blobUrl = downloadLink.href;
      const fileName = downloadLink.download || 'recording.gif';

      const container = document.createElement('div');
      container.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 10px;
        align-items: center;
        font-weight: bold;
        padding-bottom: 10px;
        padding-top: 10px;
      `;

      const shareButton = document.createElement('button');
      shareButton.className = 'share-button';
      shareButton.textContent = 'save/share';
      shareButton.style.cssText = `
        padding: 12px 24px;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-weight: bold;
        font-size: 16px;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
        width: 100%;
        max-width: 300px;
      `;

      shareButton.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();

        try {
          const response = await fetch(blobUrl);
          const blob = await response.blob();
          const file = new File([blob], fileName, { type: 'image/gif' });

          if (navigator.canShare && !navigator.canShare({ files: [file] })) {
            throw new Error('File sharing not supported');
          }

          await navigator.share({
            files: [file],
            title: 'obamification',
            text: 'made with https://obamify.com',
          });
        } catch (error) {
          if ((error as Error).name !== 'AbortError') {
            console.error('Error sharing:', error);
            alert(
              `Could not share file: ${(error as Error).message}\nTry using the download link instead.`,
            );
          }
        }
      });

      downloadLink.style.cssText = `
        padding: 10px 20px;
        background-color: transparent;
        color: white;
        border: 1px solid white;
        border-radius: 5px;
        cursor: pointer;
        font-weight: normal;
        font-size: 14px;
        text-decoration: none;
        display: inline-block;
        touch-action: manipulation;
      `;
      downloadLink.textContent = 'or download file';

      parent.insertBefore(container, downloadLink);
      container.appendChild(shareButton);
      container.appendChild(downloadLink);
    };

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length) {
          addShareButton();
          break;
        }
      }
    });

    const startObserving = () => {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
      addShareButton();
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startObserving, { once: true });
    } else {
      startObserving();
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <main>
      <canvas id="the_canvas_id" />
      <div className="centered" id="loading_text">
        <noscript>You need javascript to use this website</noscript>
        <p>Loading…</p>
        <div className="lds-dual-ring" />
      </div>
      <div className="bottom-left-icons">
        <a
          href="https://github.com/Spu7Nix/obamify"
          className="icon-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image src="/assets/github-mark-white.svg" alt="source code" width={32} height={32} priority />
          <span className="icon-text">source code</span>
        </a>
        <a href="https://spu7nix.net" className="icon-link" target="_blank" rel="noopener noreferrer">
          <Image src="/assets/pfp_transparent.png" alt="Spu7Nix" width={32} height={32} />
          <span className="icon-text">my website</span>
        </a>
      </div>
    </main>
  );
}
