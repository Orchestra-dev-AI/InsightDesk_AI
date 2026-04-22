"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Settings, 
  Cpu, 
  Globe, 
  Folder, 
  FolderSearch,
  Save, 
  RefreshCw, 
  ShieldCheck, 
  AlertCircle 
} from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import * as api from "@/lib/api-client";
import { useApi } from "@/hooks/use-api";

export default function SettingsPage() {
  const [sourceType, setSourceType] = useState<string>("INTERNAL_DEMO");
  const [remoteUrl, setRemoteUrl] = useState<string>("");
  const [localPath, setLocalPath] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  const { data: currentConfig, loading: configLoading, refetch } = useApi({
    fetcher: useCallback(() => api.config.getWorkerConfig(), []),
  });

  useEffect(() => {
    if (currentConfig) {
      setSourceType(currentConfig.source_type);
      setRemoteUrl(currentConfig.remote_url ?? "");
      setLocalPath(currentConfig.local_path ?? "");
      setApiKey(currentConfig.api_key ?? "");
    }
  }, [currentConfig]);

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus("idle");
    try {
      await api.config.updateWorkerConfig({
        source_type: sourceType,
        remote_url: remoteUrl || undefined,
        local_path: localPath || undefined,
        api_key: apiKey || undefined,
      });
      setSaveStatus("success");
      refetch();
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err) {
      console.error(err);
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const handleBrowse = async () => {
    try {
      const res = await api.config.browseLocalFile();
      if (res && res.status === "success" && res.path) {
        setLocalPath(res.path);
      }
    } catch (err) {
      console.error("Failed to open file browser:", err);
    }
  };

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
          <Settings className="w-6 h-6 text-[var(--cyan)]" />
          Worker Configuration
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Select and configure the AI source for your Quality Orchestration Platform.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Source Selection Card */}
        <div className="md:col-span-2 glass-card-static p-8 space-y-6">
          <div className="space-y-4">
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              AI Worker Source
            </label>
            
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => setSourceType("INTERNAL_DEMO")}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                  sourceType === "INTERNAL_DEMO"
                    ? "bg-[var(--cyan-glow)] border-[var(--cyan)]"
                    : "bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--text-muted)]"
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  sourceType === "INTERNAL_DEMO" ? "bg-[var(--cyan)] text-white" : "bg-[var(--bg-elevated)] text-[var(--text-muted)]"
                }`}>
                  <Cpu className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-[var(--text-primary)]">Internal Demo AI</p>
                  <p className="text-xs text-[var(--text-secondary)]">Use the built-in InsightDesk reasoning engine (Groq/NVIDIA).</p>
                </div>
                {sourceType === "INTERNAL_DEMO" && <ShieldCheck className="ml-auto w-5 h-5 text-[var(--cyan)]" />}
              </button>

              <button
                onClick={() => setSourceType("EXTERNAL_URL")}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                  sourceType === "EXTERNAL_URL"
                    ? "bg-[var(--violet-glow)] border-[var(--violet)]"
                    : "bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--text-muted)]"
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  sourceType === "EXTERNAL_URL" ? "bg-[var(--violet)] text-white" : "bg-[var(--bg-elevated)] text-[var(--text-muted)]"
                }`}>
                  <Globe className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-[var(--text-primary)]">External API URL</p>
                  <p className="text-xs text-[var(--text-secondary)]">Connect to a remote AI endpoint (e.g., your production chatbot).</p>
                </div>
                {sourceType === "EXTERNAL_URL" && <ShieldCheck className="ml-auto w-5 h-5 text-[var(--violet)]" />}
              </button>

              <button
                onClick={() => setSourceType("LOCAL_FOLDER")}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                  sourceType === "LOCAL_FOLDER"
                    ? "bg-[var(--amber-glow)] border-[var(--amber)]"
                    : "bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--text-muted)]"
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  sourceType === "LOCAL_FOLDER" ? "bg-[var(--amber)] text-white" : "bg-[var(--bg-elevated)] text-[var(--text-muted)]"
                }`}>
                  <Folder className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-[var(--text-primary)]">Local Folder / Path</p>
                  <p className="text-xs text-[var(--text-secondary)]">Load a custom agent script from a local directory.</p>
                </div>
                {sourceType === "LOCAL_FOLDER" && <ShieldCheck className="ml-auto w-5 h-5 text-[var(--amber)]" />}
              </button>
            </div>
          </div>

          {/* Dynamic Configuration Fields */}
          {(sourceType === "EXTERNAL_URL" || sourceType === "LOCAL_FOLDER") && (
            <div className="pt-6 border-t border-[var(--border-subtle)] space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
              {sourceType === "EXTERNAL_URL" ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[var(--text-muted)]">Endpoint URL</label>
                    <input
                      type="text"
                      value={remoteUrl}
                      onChange={(e) => setRemoteUrl(e.target.value)}
                      placeholder="https://api.yourdomain.com/v1/chat"
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--violet)]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[var(--text-muted)]">Auth Token (Optional)</label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--violet)]"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[var(--text-muted)]">Full File Path</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={localPath}
                        onChange={(e) => setLocalPath(e.target.value)}
                        placeholder="E:/Projects/MyAI/agent.py"
                        className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--amber)]"
                      />
                      <button
                        onClick={handleBrowse}
                        className="px-4 py-2.5 bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg flex items-center gap-2 text-sm font-semibold transition-colors text-[var(--amber)]"
                      >
                        <FolderSearch className="w-4 h-4" />
                        Browse...
                      </button>
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] italic">Note: The file must contain a `resolve(query: str)` function.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Save Button */}
          <div className="pt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {saveStatus === "success" && (
                <span className="text-xs text-[var(--green)] flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" /> Configuration saved successfully
                </span>
              )}
              {saveStatus === "error" && (
                <span className="text-xs text-[var(--red)] flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> Error updating configuration
                </span>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={saving || configLoading}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all ${
                saving ? "bg-[var(--bg-elevated)] text-[var(--text-muted)]" : "bg-white text-black hover:scale-105"
              }`}
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Updating..." : "Save Configuration"}
            </button>
          </div>
        </div>

        {/* Info/Help Side Card */}
        <div className="space-y-6">
          <div className="glass-card-static p-6 space-y-4">
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[var(--green)]" />
              Supervisor Guardrails
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Regardless of the source you choose, the **InsightDesk Supervisor** remains active. 
              All outputs from your external or local AI will be audited by the JRH (NVIDIA Llama 3.3 & Qwen 2.5) 
              before being served.
            </p>
            <div className="pt-2">
              <StatusBadge status="operational" label="Supervisors Active" />
            </div>
          </div>

          <div className="glass-card-static p-6 space-y-4">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Deployment Tip
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              For enterprise production, use **External API URL**. Point InsightDesk to your staging endpoint 
              to run full-throttle quality audits before your final release.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
