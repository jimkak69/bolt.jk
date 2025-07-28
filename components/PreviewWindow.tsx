import React from 'react';
import type { DeployState } from '../types';
import { RocketIcon, CheckIcon } from './icons';
import Loader from './Loader';

interface PreviewWindowProps {
  code: string | null;
  onDeployClick: () => void;
  deployState: DeployState;
}

const PreviewWindow: React.FC<PreviewWindowProps> = ({ code, onDeployClick, deployState }) => {
  const handleDeployAction = () => {
    if (deployState.status === 'success' && deployState.url) {
      window.open(deployState.url, '_blank', 'noopener,noreferrer');
    } else if (deployState.status !== 'loading') {
      onDeployClick();
    }
  };

  const getDeployButtonContent = () => {
    switch (deployState.status) {
      case 'loading':
        return <><Loader /> <span className="ml-2">Deploying...</span></>;
      case 'success':
        return <><CheckIcon className="w-5 h-5 mr-2" /> <span>Deployed</span></>;
      case 'error':
        return <><span>Error, Retry?</span></>;
      default:
        return <><RocketIcon className="w-5 h-5 mr-2" /> <span>Deploy</span></>;
    }
  };
  
  const getDeployButtonClass = () => {
     let baseClass = "flex items-center justify-center px-4 py-1.5 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-200";
     switch (deployState.status) {
        case 'loading':
            return `${baseClass} bg-gray-600 text-white cursor-not-allowed`;
        case 'success':
            return `${baseClass} bg-green-600 hover:bg-green-700 text-white focus:ring-green-500`;
        case 'error':
            return `${baseClass} bg-red-600 hover:bg-red-700 text-white focus:ring-red-500`;
        default:
            return `${baseClass} bg-violet-600 hover:bg-violet-700 text-white focus:ring-violet-500`;
     }
  }

  return (
    <div className="flex-1 flex flex-col bg-black m-4 rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-black/30">
       <div className="flex-shrink-0 bg-gray-900 px-4 py-3 flex items-center justify-between border-b border-white/10">
         <div className="flex items-center space-x-2">
           <div className="w-3.5 h-3.5 bg-red-500 rounded-full"></div>
           <div className="w-3.5 h-3.5 bg-yellow-400 rounded-full"></div>
           <div className="w-3.5 h-3.5 bg-green-500 rounded-full"></div>
         </div>
        <div className="flex-1 text-center">
            <p className="text-sm text-gray-500">Preview</p>
        </div>
        <div>
          {code && (
            <button onClick={handleDeployAction} className={getDeployButtonClass()} disabled={deployState.status === 'loading'}>
              {getDeployButtonContent()}
            </button>
          )}
        </div>
       </div>
      <div className="w-full flex-1 bg-white">
        {code ? (
          <iframe
            srcDoc={code}
            title="Website Preview"
            className="w-full h-full border-none"
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-white text-gray-400 p-8 text-center">
            <p>Your generated website will be previewed here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreviewWindow;
