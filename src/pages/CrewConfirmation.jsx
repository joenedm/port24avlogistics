import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function CrewConfirmation() {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState('loading'); // loading, success, error, expired
  const [assignment, setAssignment] = useState(null);
  const [message, setMessage] = useState('');
  const token = searchParams.get('token');
  const action = searchParams.get('action');
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    if (!token || !action) {
      setState('error');
      setMessage('Invalid confirmation link');
      return;
    }

    processConfirmation();
  }, [token, action]);

  const processConfirmation = async () => {
    try {
      const response = await base44.functions.invoke('processCrewConfirmation', {
        token,
        action
      });

      if (response.data.success) {
        setState('success');
        setAssignment(response.data.assignment);
        setMessage(
          action === 'confirm'
            ? 'You are confirmed for this project'
            : 'You have declined this assignment'
        );
      } else {
        setState('error');
        setMessage(response.data.message || 'Unable to process confirmation');
      }
    } catch (err) {
      setState('error');
      setMessage(err.message || 'An error occurred');
    }
  };

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Processing your confirmation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-emerald-100 p-4">
        <Card className="w-full max-w-md border-emerald-200">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle className="w-16 h-16 text-emerald-600 mb-4" />
            <h1 className="text-2xl font-bold mb-2">
              {action === 'confirm' ? 'You\'re Confirmed!' : 'Declined'}
            </h1>
            <p className="text-lg text-muted-foreground mb-2">{message}</p>
            
            {assignment && (
              <div className="mt-6 w-full space-y-2 text-left bg-slate-50 rounded-lg p-4">
                <div>
                  <p className="text-xs text-muted-foreground">Project</p>
                  <p className="font-semibold">{assignment.show_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Role</p>
                  <p className="font-semibold">{assignment.role}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-semibold">{assignment.assignment_date}</p>
                </div>
                {assignment.start_time && (
                  <div>
                    <p className="text-xs text-muted-foreground">Time</p>
                    <p className="font-semibold">
                      {assignment.start_time} - {assignment.end_time}
                    </p>
                  </div>
                )}
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-6">
              You can close this window now. Status updated in project.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 p-4">
      <Card className="w-full max-w-md border-red-200">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          {state === 'expired' ? (
            <XCircle className="w-16 h-16 text-red-600 mb-4" />
          ) : (
            <AlertCircle className="w-16 h-16 text-red-600 mb-4" />
          )}
          <h1 className="text-2xl font-bold mb-2">
            {state === 'expired' ? 'Link Expired' : 'Error'}
          </h1>
          <p className="text-muted-foreground mb-6">{message}</p>
          <Button onClick={() => window.location.href = '/'}>
            Return to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}