import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '../i18n'
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
import { Warning } from '@phosphor-icons/react'
import { Alert, AlertDescription } from './ui/alert'

// ISO 3166-1 alpha-2 country codes - top 50 by population + music markets
const COUNTRY_CODES = [
  'US', 'GB', 'CA', 'AU', 'DE', 'FR', 'JP', 'KR', 'BR', 'MX', 
  'IN', 'CN', 'ID', 'IT', 'ES', 'NL', 'SE', 'NO', 'DK', 'FI', 
  'PL', 'RU', 'TR', 'SA', 'AE', 'IL', 'SG', 'HK', 'TW', 'TH', 
  'MY', 'PH', 'VN', 'AR', 'CL', 'CO', 'PE', 'ZA', 'NG', 'EG', 
  'KE', 'NZ', 'IE', 'AT', 'CH', 'BE', 'PT', 'GR', 'CZ', 'HU'
]

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

  // Create sorted countries list using native browser API
  const displayNames = new Intl.DisplayNames([i18n.language], { type: 'region' })
  const countries = COUNTRY_CODES.map(code => ({
    code,
    name: displayNames.of(code) || code
  })).sort((a, b) => a.name.localeCompare(b.name, i18n.language))

  // Fetch IP-based country when dialog opens
  useEffect(() => {
    if (open && !ipCountry) {
      setLoading(true)
      fetch('https://ipapi.co/json/')
        .then(res => res.json())
        .then(data => {
          if (data.country_code) {
            setIpCountry(data.country_code)
            // Auto-select the IP country if user hasn't selected anything yet
            if (!selectedCountry) {
              setSelectedCountry(data.country_code)
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
    ? displayNames.of(ipCountry) || ipCountry
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
            {t('countryDialog.nonprofit')} • {t('countryDialog.ownData')} • {t('countryDialog.donation')}
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
                {countries.map(country => (
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
              <Warning className="h-4 w-4 text-yellow-600" />
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