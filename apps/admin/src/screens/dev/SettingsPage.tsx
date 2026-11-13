"use client";
import { useEffect, useState } from "react";
import { devApi } from "../../lib/devApi";

type Settings = {
  appName: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
  whiteLogoUrl: string;
  faviconUrl: string;
};
type AssetKind = "logo" | "logo-white" | "favicon";
const initial: Settings = {
  appName: "Quali Benefícios", primaryColor: "#0c66aa",
  secondaryColor: "#21834a", logoUrl: "", whiteLogoUrl: "", faviconUrl: "",
};

function ImageUploader({ kind, url, onUploaded }: {
  kind: AssetKind;
  url: string;
  onUploaded: (value: Settings) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const title = kind === "logo" ? "Logotipo" : kind === "logo-white" ? "Logo branca do cartão" : "Favicon";
  async function upload() {
    if (!file) return;
    setPending(true); setError(""); setSuccess("");
    const data = new FormData();
    data.append("file", file);
    try {
      const response = await fetch(`/admin/api/dev/branding/upload/${kind}`, {
        method: "POST", body: data, credentials: "same-origin", cache: "no-store",
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(typeof json.message === "string" ? json.message : json.error || "Falha no upload");
      }
      onUploaded(json as Settings);
      setFile(null);
      setSuccess(`${title} atualizado. Recarregue as páginas para visualizar a nova imagem.`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Falha ao enviar a imagem");
    } finally {
      setPending(false);
    }
  }
  return <div className="brand-upload-card">
    <strong>{title}</strong>
    <div className={`brand-upload-preview ${kind === "logo-white" ? "brand-upload-preview-dark" : ""}`}>
      {url ? <img src={`${url}?preview=${success.length}`} alt={`Prévia do ${title.toLowerCase()}`} /> : <span className="muted">Nenhuma imagem cadastrada</span>}
    </div>
    <label htmlFor={`brand-upload-${kind}`} className="muted">{kind === "logo-white" ? "PNG ou WebP com fundo transparente · até 2 MB. O sistema transforma os elementos visíveis em branco." : "PNG, JPG ou WebP · até 2 MB"}</label>
    <input id={`brand-upload-${kind}`} type="file" accept={kind === "logo-white" ? "image/png,image/webp" : "image/png,image/jpeg,image/webp"}
      onChange={e => {setFile(e.target.files?.[0] ?? null);setError("");}} />
    <button type="button" className="primary" disabled={!file || pending} onClick={upload}>
      {pending ? "Enviando..." : `Enviar ${title.toLowerCase()}`}
    </button>
    {error && <p className="notice error" role="alert">{error}</p>}
    {success && <p className="notice success" role="status">{success}</p>}
  </div>;
}

export function SettingsPage() {
  const [form, setForm] = useState<Settings>(initial);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  useEffect(() => {
    devApi<Settings>("settings").then(setForm)
      .catch(e => setError((e as Error).message)).finally(() => setLoading(false));
  }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true); setError(""); setSuccess("");
    try {
      const updated = await devApi<Settings>("settings", "PUT", {
        appName: form.appName,
        primaryColor: form.primaryColor,
        secondaryColor: form.secondaryColor,
      });
      setForm(updated);
      setSuccess("Cores e nome salvos. Recarregue o Clube e o Admin para aplicar as alterações.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  }
  if (loading) return <p>Carregando configurações...</p>;
  return <div className="dev-page">
    <header className="page-title">
      <div><h1>Sistema</h1><p>Identidade visual compartilhada com Clube e Admin</p></div>
    </header>
    <section className="panel">
      <h2>Nome e cores</h2>
      <form className="dev-form" onSubmit={submit}>
        <label>Nome exibido
          <input required maxLength={80} value={form.appName}
            onChange={e => setForm({ ...form, appName: e.target.value })} />
        </label>
        <label>Cor principal
          <div className="dev-color">
            <input aria-label="Escolher cor principal" type="color" value={form.primaryColor}
              onChange={e => setForm({ ...form, primaryColor: e.target.value })} />
            <input aria-label="Código da cor principal" value={form.primaryColor} pattern="#[0-9a-fA-F]{6}"
              onChange={e => setForm({ ...form, primaryColor: e.target.value })} />
          </div>
        </label>
        <label>Cor secundária
          <div className="dev-color">
            <input aria-label="Escolher cor secundária" type="color" value={form.secondaryColor}
              onChange={e => setForm({ ...form, secondaryColor: e.target.value })} />
            <input aria-label="Código da cor secundária" value={form.secondaryColor} pattern="#[0-9a-fA-F]{6}"
              onChange={e => setForm({ ...form, secondaryColor: e.target.value })} />
          </div>
        </label>
        <div className="dev-actions">
          <button className="primary" disabled={saving}>{saving ? "Salvando..." : "Salvar identidade visual"}</button>
        </div>
      </form>
      {error && <p className="notice error" role="alert">{error}</p>}
      {success && <p className="notice success" role="status">{success}</p>}
    </section>
    <section className="panel gap-panel">
      <h2>Arquivos da marca</h2>
      <p className="muted">Selecione as imagens no seu computador. O servidor converte os arquivos para PNG antes de armazená-los. O upload é exclusivo de usuários DEV.</p>
      <div className="brand-upload-grid">
        <ImageUploader kind="logo" url={form.logoUrl} onUploaded={setForm} />
        <ImageUploader kind="logo-white" url={form.whiteLogoUrl} onUploaded={setForm} />
        <ImageUploader kind="favicon" url={form.faviconUrl} onUploaded={setForm} />
      </div>
    </section>
    <section className="panel gap-panel">
      <h2>Prévia das cores</h2>
      <div className="brand-preview">
        <span style={{ backgroundColor: form.primaryColor }}>Cor principal</span>
        <span style={{ backgroundColor: form.secondaryColor }}>Cor secundária</span>
      </div>
    </section>
  </div>;
}
