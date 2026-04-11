import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Eye, EyeOff, Copy, CheckCircle, XCircle, Loader } from 'lucide-react'
import { toast } from 'sonner'
import { getSettings, saveSettings, testLineConnection, testGoogleConnection } from '@/lib/api'
import { cn } from '@/lib/utils'

function PasswordInput({
  id, value, onChange, placeholder
}: {
  id: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 px-3 pr-10 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        autoComplete="off"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none"
        aria-label={show ? '隱藏' : '顯示'}
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  )
}

function ConnectionStatus({ status }: { status: 'connected' | 'disconnected' | 'unknown' }) {
  return (
    <div className={cn(
      'flex items-center gap-1.5 text-xs font-medium',
      status === 'connected' ? 'text-emerald-600' : status === 'disconnected' ? 'text-red-600' : 'text-muted-foreground'
    )}>
      {status === 'connected'
        ? <><CheckCircle size={13} /> 已連線</>
        : status === 'disconnected'
        ? <><XCircle size={13} /> 未連線</>
        : <><Loader size={13} className="animate-spin" /> 檢查中</>
      }
    </div>
  )
}

export function Settings() {
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  })

  const [form, setForm] = useState({
    googleServiceAccountEmail: '',
    googlePrivateKey: '',
    lineChannelAccessToken: '',
    lineChannelSecret: '',
  })

  const update = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const saveMutation = useMutation({
    mutationFn: () => saveSettings(form),
    onSuccess: () => toast.success('設定已儲存'),
    onError: (err: Error) => toast.error(err.message),
  })

  const testLineMutation = useMutation({
    mutationFn: testLineConnection,
    onSuccess: () => toast.success('LINE 連線測試成功'),
    onError: (err: Error) => toast.error(`LINE 連線失敗：${err.message}`),
  })

  const testGoogleMutation = useMutation({
    mutationFn: testGoogleConnection,
    onSuccess: () => toast.success('Google 連線測試成功'),
    onError: (err: Error) => toast.error(`Google 連線失敗：${err.message}`),
  })

  const copyWebhook = () => {
    if (settings?.lineWebhookUrl) {
      void navigator.clipboard.writeText(settings.lineWebhookUrl)
      toast.success('已複製 Webhook URL')
    }
  }

  return (
    <div className="space-y-6">
      {/* Google Sheets API */}
      <div className="bg-white rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-foreground">📌 Google Sheets API</h2>
          {settings && <ConnectionStatus status={settings.googleConnectionStatus} />}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="google-email">
              Service Account Email
            </label>
            <input
              id="google-email"
              type="email"
              value={form.googleServiceAccountEmail || settings?.googleServiceAccountEmail || ''}
              onChange={(e) => update('googleServiceAccountEmail', e.target.value)}
              placeholder="xxx@xxx.iam.gserviceaccount.com"
              className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="google-key">
              Private Key
            </label>
            <PasswordInput
              id="google-key"
              value={form.googlePrivateKey}
              onChange={(v) => update('googlePrivateKey', v)}
              placeholder="-----BEGIN PRIVATE KEY-----..."
            />
          </div>

          <button
            onClick={() => testGoogleMutation.mutate()}
            disabled={testGoogleMutation.isPending}
            className="text-sm text-primary hover:underline disabled:opacity-50 focus-visible:outline-none"
          >
            {testGoogleMutation.isPending ? '測試中...' : '測試 Google 連線'}
          </button>
        </div>
      </div>

      {/* LINE Bot */}
      <div className="bg-white rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-foreground">📌 LINE Bot</h2>
          {settings && <ConnectionStatus status={settings.lineConnectionStatus} />}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="line-token">
              Channel Access Token
            </label>
            <PasswordInput
              id="line-token"
              value={form.lineChannelAccessToken}
              onChange={(v) => update('lineChannelAccessToken', v)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="line-secret">
              Channel Secret
            </label>
            <PasswordInput
              id="line-secret"
              value={form.lineChannelSecret}
              onChange={(v) => update('lineChannelSecret', v)}
            />
          </div>

          {/* Webhook URL */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Webhook URL</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={settings?.lineWebhookUrl ?? ''}
                readOnly
                className="flex-1 h-10 px-3 rounded-lg border border-border bg-muted text-sm text-muted-foreground"
                aria-label="Webhook URL（唯讀）"
              />
              <button
                onClick={copyWebhook}
                className="w-10 h-10 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title="複製"
                aria-label="複製 Webhook URL"
              >
                <Copy size={14} />
              </button>
            </div>
          </div>

          <button
            onClick={() => testLineMutation.mutate()}
            disabled={testLineMutation.isPending}
            className="text-sm text-primary hover:underline disabled:opacity-50 focus-visible:outline-none"
          >
            {testLineMutation.isPending ? '測試中...' : '測試 LINE 連線'}
          </button>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {saveMutation.isPending ? '儲存中...' : '儲存設定'}
        </button>
      </div>
    </div>
  )
}
