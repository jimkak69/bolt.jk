import React, { useState, useEffect } from 'react';
import { GithubIcon } from './icons';
import Loader from './Loader';

const GITHUB_TOKEN_KEY = 'bolt-jk-github-token';

interface DeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeploy: (details: { token: string; repoName: string }) => void;
  isLoading: boolean;
  projectName: string;
  error: string | null;
  clearError: () => void;
}

const DeployModal: React.FC<DeployModalProps> = ({ isOpen, onClose, onDeploy, isLoading, projectName, error, clearError }) => {
  const [token, setToken] = useState('');
  const [repoName, setRepoName] = useState('');

  useEffect(() => {
    if (isOpen) {
      const savedToken = localStorage.getItem(GITHUB_TOKEN_KEY);
      if (savedToken) {
        setToken(savedToken);
      }
      setRepoName(projectName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
      clearError();
    }
  }, [isOpen, projectName, clearError]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (token && repoName && !isLoading) {
      localStorage.setItem(GITHUB_TOKEN_KEY, token);
      onDeploy({ token, repoName });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl text-gray-200" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="p-8 border-b border-white/10">
            <div className="flex items-center space-x-4 mb-4">
              <GithubIcon className="w-8 h-8 text-violet-400" />
              <h2 className="text-2xl font-bold text-white">Deploy to GitHub Pages</h2>
            </div>
            <p className="text-gray-400">This will create a new public repository on your GitHub account and publish the website.</p>
          </div>
          
          <div className="p-8 space-y-6">
            <div>
              <label htmlFor="repoName" className="block text-sm font-medium text-gray-300 mb-2">Public Repository Name</label>
              <input
                id="repoName"
                type="text"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-gray-200 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-colors"
                required
              />
            </div>
            <div>
              <label htmlFor="token" className="block text-sm font-medium text-gray-300 mb-2">GitHub Personal Access Token</label>
              <input
                id="token"
                type="password"
                placeholder={token ? '•••••••••••••••••••• (saved)' : 'ghp_...'}
                onChange={(e) => setToken(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-gray-200 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-colors"
                required={!token}
              />
              <p className="text-xs text-gray-500 mt-2">
                Your token is only stored in your browser's local storage. You need to create a token with{' '}
                <code className="bg-violet-500/10 text-violet-300 px-1 py-0.5 rounded text-xs">public_repo</code> and <code className="bg-violet-500/10 text-violet-300 px-1 py-0.5 rounded text-xs">workflow</code> scopes. 
                <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline ml-1">Create one here.</a>
              </p>
            </div>
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                <strong>Deployment Error:</strong> {error}
              </div>
            )}
          </div>

          <div className="px-8 py-6 bg-black/20 border-t border-white/10 flex justify-end items-center space-x-4 rounded-b-2xl">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-400 hover:bg-white/10 rounded-md transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !repoName || !token}
              className="flex items-center justify-center min-w-[120px] px-5 py-2.5 bg-violet-600 text-white font-semibold rounded-lg hover:bg-violet-700 disabled:bg-gray-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 focus:ring-offset-gray-900 transition-colors"
            >
              {isLoading ? <Loader /> : 'Deploy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeployModal;
