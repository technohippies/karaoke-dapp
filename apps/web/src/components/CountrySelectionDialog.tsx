import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'
import { Label } from './ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from './ui/alert'

// ISO 3166-1 alpha-2 country codes - top 50 by population + music markets
const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'IN', name: 'India' },
  { code: 'CN', name: 'China' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'PL', name: 'Poland' },
  { code: 'RU', name: 'Russia' },
  { code: 'TR', name: 'Turkey' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'IL', name: 'Israel' },
  { code: 'SG', name: 'Singapore' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'TH', name: 'Thailand' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'PH', name: 'Philippines' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colombia' },
  { code: 'PE', name: 'Peru' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'EG', name: 'Egypt' },
  { code: 'KE', name: 'Kenya' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'IE', name: 'Ireland' },
  { code: 'AT', name: 'Austria' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'BE', name: 'Belgium' },
  { code: 'PT', name: 'Portugal' },
  { code: 'GR', name: 'Greece' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'HU', name: 'Hungary' },
].sort((a, b) => a.name.localeCompare(b.name))

interface CountrySelectionDialogProps {
  open: boolean
  onCountrySelect: (countryCode: string) => void
}

export function CountrySelectionDialog({ open, onCountrySelect }: CountrySelectionDialogProps) {
  const { t } = useTranslation()
  const [selectedCountry, setSelectedCountry] = useState<string>('')
  const [ipCountry, setIpCountry] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showMismatchWarning, setShowMismatchWarning] = useState(false)

  // Fetch IP-based country when dialog opens
  useEffect(() => {
    if (open && !ipCountry) {
      setLoading(true)
      fetch('http://ip-api.com/json/?fields=status,countryCode')
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success' && data.countryCode) {
            setIpCountry(data.countryCode)
            // Auto-select the IP country if user hasn't selected anything yet
            if (!selectedCountry) {
              setSelectedCountry(data.countryCode)
            }
          }
        })
        .catch(err => {
          console.error('Failed to fetch IP location:', err)
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [open, ipCountry, selectedCountry])

  // Check for mismatch when country is selected
  useEffect(() => {
    if (selectedCountry && ipCountry && selectedCountry !== ipCountry) {
      setShowMismatchWarning(true)
    } else {
      setShowMismatchWarning(false)
    }
  }, [selectedCountry, ipCountry])

  const handleConfirm = () => {
    if (selectedCountry) {
      onCountrySelect(selectedCountry)
    }
  }

  const ipCountryName = ipCountry 
    ? COUNTRIES.find(c => c.code === ipCountry)?.name || ipCountry
    : null

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-[425px] bg-neutral-900 text-white border-neutral-700"
        showCloseButton={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader className="text-left">
          <DialogTitle className="text-xl text-left">{t('countryDialog.title')}</DialogTitle>
          <DialogDescription className="text-neutral-300 text-md text-left">
            <ul className="list-disc list-inside space-y-1">
              <li>{t('countryDialog.nonprofit')}</li>
              <li>{t('countryDialog.ownData')}</li>
              <li>{t('countryDialog.donation')}</li>
            </ul>
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="country" className="text-neutral-200 text-md">
              {t('countryDialog.yourCountry')}
            </Label>
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger 
                id="country"
                className="bg-neutral-800 border-neutral-700 text-white text-md"
              >
                <SelectValue placeholder={t('countryDialog.selectCountry')} />
              </SelectTrigger>
              <SelectContent 
                className="bg-neutral-800 border-neutral-700" 
                position="item-aligned"
              >
                {COUNTRIES.map(country => (
                  <SelectItem 
                    key={country.code} 
                    value={country.code}
                    className="text-white hover:bg-neutral-700 focus:bg-neutral-700 text-md"
                  >
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading && (
            <p className="text-md text-neutral-400">{t('countryDialog.detecting')}</p>
          )}

          {showMismatchWarning && ipCountryName && (
            <Alert className="bg-yellow-900/20 border-yellow-700/50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-200 text-md">
                {t('countryDialog.ipMismatch', { country: ipCountryName })}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button 
            onClick={handleConfirm}
            disabled={!selectedCountry}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {t('countryDialog.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}