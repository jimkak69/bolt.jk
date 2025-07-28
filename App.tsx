
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Header from './components/Header';
import PreviewWindow from './components/PreviewWindow';
import DeployModal from './components/DeployModal';
import { generateWebsiteCode, generateConversationName } from './services/geminiService';
import { deployToGithubPages } from './services/githubService';
import type { WebsiteProject, Message, DeployState } from './types';
import WebsiteList from './components/WebsiteList';
import ChatPanel from './components/ChatPanel';
import { CodeIcon } from './components/icons';

const PROJECTS_STORAGE_KEY = 'bolt-jk-projects';
const ACTIVE_PROJECT_ID_STORAGE_KEY = 'bolt-jk-active-project-id';

const App: React.FC = () => {
  const [projects, setProjects] = useState<WebsiteProject[]>(() => {
    try {
      const storedProjects = localStorage.getItem(PROJECTS_STORAGE_KEY);
      return storedProjects ? JSON.parse(storedProjects) : [];
    } catch (error) {
      console.error("Failed to parse projects from localStorage", error);
      return [];
    }
  });

  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => {
    return localStorage.getItem(ACTIVE_PROJECT_ID_STORAGE_KEY) ?? null;
  });
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState<boolean>(false);
  const [deployState, setDeployState] = useState<DeployState>({ status: 'idle' });

  useEffect(() => {
    if (projects.length === 0) {
      const newProject: WebsiteProject = {
        id: `website-${Date.now()}`,
        name: 'New Website',
        chatHistory: [],
        generatedCode: null,
      };
      setProjects([newProject]);
      setActiveProjectId(newProject.id);
    } else if (!activeProjectId || !projects.some(p => p.id === activeProjectId)) {
      setActiveProjectId(projects[0]?.id ?? null);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
      if (activeProjectId) {
        localStorage.setItem(ACTIVE_PROJECT_ID_STORAGE_KEY, activeProjectId);
      } else {
        localStorage.removeItem(ACTIVE_PROJECT_ID_STORAGE_KEY);
      }
    } catch (error) {
      console.error("Failed to save state to localStorage", error);
    }
  }, [projects, activeProjectId]);
  
  // Reset deploy state when switching projects
  useEffect(() => {
    if (deployState.status !== 'idle' && deployState.projectId !== activeProjectId) {
        setDeployState({ status: 'idle' });
    }
  }, [activeProjectId, deployState]);


  const handleNewProject = useCallback(() => {
    const newProject: WebsiteProject = {
      id: `website-${Date.now()}`,
      name: `Website ${projects.length + 1}`,
      chatHistory: [],
      generatedCode: null,
    };
    setProjects(prev => [...prev, newProject]);
    setActiveProjectId(newProject.id);
    setError(null);
  }, [projects.length]);

  const handleSelectProject = useCallback((id: string) => {
    setActiveProjectId(id);
    setError(null);
  }, []);

  const handleDeleteProject = useCallback((idToDelete: string) => {
    setProjects(prevProjects => {
      const remainingProjects = prevProjects.filter(p => p.id !== idToDelete);
      
      if (activeProjectId === idToDelete) {
        if (remainingProjects.length > 0) {
          setActiveProjectId(remainingProjects[0].id);
        } else {
          const newProject: WebsiteProject = {
            id: `website-${Date.now()}`,
            name: 'New Website',
            chatHistory: [],
            generatedCode: null,
          };
          setActiveProjectId(newProject.id);
          return [newProject];
        }
      }
      return remainingProjects;
    });
  }, [activeProjectId]);

  const handleSendMessage = async (prompt: string) => {
    if (!prompt.trim() || isLoading || !activeProjectId) return;

    setIsLoading(true);
    setError(null);
    
    const projectsBeforeUpdate = JSON.parse(JSON.stringify(projects));
    const projectIndex = projects.findIndex(p => p.id === activeProjectId);

    if (projectIndex === -1) {
      setError("Active project not found. Please select a project.");
      setIsLoading(false);
      return;
    }

    const currentProject = projects[projectIndex];
    const userMessage: Message = { role: 'user', content: prompt };
    const updatedChatHistory = [...currentProject.chatHistory, userMessage];
    const isFirstMessage = currentProject.chatHistory.length === 0;

    const updatedProjects = [...projects];
    updatedProjects[projectIndex] = {
      ...currentProject,
      chatHistory: updatedChatHistory,
      name: isFirstMessage && prompt.length > 0 ? prompt.substring(0, 40) + (prompt.length > 40 ? '...' : '') : currentProject.name,
    };
    setProjects(updatedProjects);

    if (isFirstMessage && prompt.length > 0) {
      generateConversationName(prompt).then(newName => {
        setProjects(prevProjects => {
          const finalProjects = [...prevProjects];
          const projToUpdateIndex = finalProjects.findIndex(p => p.id === activeProjectId);
          if (projToUpdateIndex !== -1) {
            finalProjects[projToUpdateIndex].name = newName;
          }
          return finalProjects;
        });
      }).catch(e => {
        console.error("Could not generate AI project name", e);
      });
    }

    try {
      const { summary, code } = await generateWebsiteCode(updatedChatHistory);
      const assistantMessage: Message = { role: 'assistant', content: summary };
      
      const latestProjectState = projects.find(p => p.id === activeProjectId) || currentProject;
      const newGeneratedCode = code !== null ? code : latestProjectState.generatedCode;

      setProjects(prevProjects => {
          const finalProjects = [...prevProjects];
          const projToUpdateIndex = finalProjects.findIndex(p => p.id === activeProjectId);
          if (projToUpdateIndex !== -1) {
            finalProjects[projToUpdateIndex] = {
              ...finalProjects[projToUpdateIndex],
              chatHistory: [...updatedChatHistory, assistantMessage],
              generatedCode: newGeneratedCode,
            };
          }
          return finalProjects;
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setProjects(projectsBeforeUpdate);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeploy = async ({ token, repoName }: { token: string; repoName: string }) => {
    const projectToDeploy = projects.find(p => p.id === activeProjectId);
    if (!projectToDeploy || !projectToDeploy.generatedCode) {
      setDeployState({ status: 'error', error: 'No code to deploy.', projectId: activeProjectId });
      return;
    }
    
    setDeployState({ status: 'loading', projectId: activeProjectId });
    try {
      const url = await deployToGithubPages({
        token,
        repoName,
        htmlContent: projectToDeploy.generatedCode,
      });
      setDeployState({ status: 'success', url, projectId: activeProjectId });
      setIsDeployModalOpen(false);
    } catch (error) {
      setDeployState({ status: 'error', error: error instanceof Error ? error.message : 'Unknown error', projectId: activeProjectId });
    }
  };
  
  const activeProject = useMemo(() => projects.find(p => p.id === activeProjectId), [projects, activeProjectId]);

  const previewDeployState = useMemo<DeployState>(() => {
    if (deployState.status !== 'idle' && deployState.projectId === activeProjectId) {
      return deployState;
    }
    return { status: 'idle' };
  }, [deployState, activeProjectId]);

  return (
    <>
      <div className="flex h-screen bg-black text-gray-200 font-sans">
        <WebsiteList 
          projects={projects}
          activeProjectId={activeProjectId}
          onSelectProject={handleSelectProject}
          onNewProject={handleNewProject}
          onDeleteProject={handleDeleteProject}
        />
        <div className="flex flex-1 min-w-0">
          {activeProject ? (
            <>
              <div className="w-full md:w-1/2 lg:w-5/12 flex flex-col h-full border-r border-white/10">
                 <Header projectName={activeProject.name} />
                 <ChatPanel 
                   project={activeProject}
                   isLoading={isLoading}
                   error={error}
                   onSendMessage={handleSendMessage}
                   clearError={() => setError(null)}
                 />
              </div>
              
              <div className="hidden md:flex flex-1 h-full">
                 <PreviewWindow 
                   code={activeProject.generatedCode}
                   onDeployClick={() => setIsDeployModalOpen(true)}
                   deployState={previewDeployState}
                 />
              </div>
            </>
          ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500 p-8">
                <CodeIcon className="w-16 h-16 mb-4 opacity-50" />
                <h2 className="text-xl font-semibold text-gray-300">No Website Selected</h2>
                <p className="mt-2 max-w-sm">Create a new website using the button in the sidebar or select an existing one to continue working.</p>
             </div>
          )}
        </div>
      </div>
      {activeProject && (
        <DeployModal
          isOpen={isDeployModalOpen}
          onClose={() => setIsDeployModalOpen(false)}
          onDeploy={handleDeploy}
          isLoading={deployState.status === 'loading'}
          projectName={activeProject.name}
          error={deployState.status === 'error' && deployState.projectId === activeProjectId ? deployState.error : null}
          clearError={() => setDeployState({ status: 'idle' })}
        />
      )}
    </>
  );
};

export default App;
