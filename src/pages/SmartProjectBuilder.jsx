import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowLeft, Settings2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/db';
import PageHeader from '@/components/shared/PageHeader';
import BuilderInputForm from '@/components/smart-builder/BuilderInputForm';
import BuilderReviewPanel from '@/components/smart-builder/BuilderReviewPanel';
import { useSmartBuild } from '@/lib/useSmartBuild';

export default function SmartProjectBuilder() {
  const navigate = useNavigate();
  const [step, setStep] = useState('input'); // 'input' | 'generating' | 'review'
  const [inputs, setInputs] = useState(null);
  const [draft, setDraft] = useState(null);

  const { generate, building, error, usedFallback } = useSmartBuild();

  const { data: calibrations = [] } = useQuery({
    queryKey: ['fulfillment_calibrations'],
    queryFn: () => db.entities.FulfillmentCalibration.filter({ is_active: true }),
  });
  const calibratedCount = calibrations.filter(c => (c.preferred_items || []).length > 0).length;

  const handleGenerate = async (formInputs) => {
    setInputs(formInputs);
    setStep('generating');
    const result = await generate(formInputs);
    if (result) {
      setDraft(result);
      setStep('review');
    } else {
      setStep('input');
    }
  };

  const handleRegenerate = async (updatedInputs) => {
    const newInputs = updatedInputs || inputs;
    setInputs(newInputs);
    setStep('generating');
    const result = await generate(newInputs);
    if (result) {
      setDraft(result);
      setStep('review');
    } else {
      setStep('review');
    }
  };

  const handleProjectCreated = (showId) => {
    navigate(`/shows/${showId}`);
  };

  return (
    <div>
      <PageHeader
        title="Smart Project Builder"
        description="AI-assisted show planning — describe your event and get a recommended project draft"
        actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/fulfillment-calibration')}>
            <Settings2 className="w-4 h-4 mr-2" /> Calibrate AI
            {calibratedCount > 0 && <span className="ml-1 text-xs text-primary">({calibratedCount})</span>}
          </Button>
          <Button variant="outline" onClick={() => navigate('/shows')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Shows
          </Button>
        </div>
        }
      />

      {/* Calibration nudge — shown when no calibration has been done yet */}
      {calibratedCount === 0 && step === 'input' && (
        <div className="flex items-start gap-3 p-4 mb-5 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-600">AI not yet calibrated for your inventory</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              The AI will do its best, but without calibration it may not know which of your specific items to prefer for each scenario.
              Run the calibration once to teach it your exact inventory preferences.
            </p>
          </div>
          <Button size="sm" variant="outline" className="shrink-0 border-amber-500/30 text-amber-600 hover:bg-amber-500/10" onClick={() => navigate('/fulfillment-calibration')}>
            <Settings2 className="w-3.5 h-3.5 mr-1.5" /> Run Calibration
          </Button>
        </div>
      )}
      {calibratedCount > 0 && step === 'input' && (
        <div className="flex items-center gap-2 p-3 mb-5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-600">
          <Sparkles className="w-4 h-4 shrink-0" />
          <span><strong>{calibratedCount} scenarios calibrated</strong> — the AI will prefer your mapped inventory when building this show.</span>
        </div>
      )}

      {step === 'input' && (
        <BuilderInputForm onGenerate={handleGenerate} generating={building} error={error} />
      )}

      {step === 'generating' && (
        <Card className="p-16 flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          <div className="text-center">
            <p className="font-semibold text-lg">Building your project draft…</p>
            <p className="text-sm text-muted-foreground mt-1">Analyzing your inventory, past projects, and show requirements</p>
          </div>
        </Card>
      )}

      {step === 'review' && draft && (
        <BuilderReviewPanel
          draft={draft}
          inputs={inputs}
          usedFallback={usedFallback}
          onRegenerate={handleRegenerate}
          onProjectCreated={handleProjectCreated}
          onBack={() => setStep('input')}
        />
      )}
    </div>
  );
}