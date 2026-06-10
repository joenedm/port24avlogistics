import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import EmailApprovalWorkflow from '@/components/email/EmailApprovalWorkflow';

export default function SendCrewEmail() {
  const [selectedShow, setSelectedShow] = useState('');
  const [selectedPerson, setSelectedPerson] = useState('');
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [selectedPersonData, setSelectedPersonData] = useState(null);
  const [selectedShowData, setSelectedShowData] = useState(null);
  const [recipientEmail, setRecipientEmail] = useState('');

  const { data: shows = [] } = useQuery({
    queryKey: ['shows'],
    queryFn: () => base44.entities.Show.list(),
  });

  const { data: projectCrew = [] } = useQuery({
    queryKey: ['projectCrew'],
    queryFn: () => base44.entities.ProjectCrew.list(),
  });

  const { data: crewMembers = [] } = useQuery({
    queryKey: ['crewMembers'],
    queryFn: () => base44.entities.CrewMember.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  // Filter crew for selected show
  const crewForShow = selectedShow
    ? projectCrew.filter(c => c.show_id === selectedShow)
    : [];

  const handleShowChange = (showId) => {
    setSelectedShow(showId);
    setSelectedPerson('');
    setSelectedPersonData(null);
    setRecipientEmail('');
  };

  const handlePersonChange = (personId) => {
    setSelectedPerson(personId);
    
    // Find person data
    const crewRecord = projectCrew.find(c => c.id === personId);
    if (crewRecord) {
      setSelectedPersonData(crewRecord);
      setRecipientEmail(crewRecord.crew_member_email || '');
    }
  };

  const handleOpenWorkflow = () => {
    if (!selectedShow || !selectedPerson) {
      return;
    }
    
    const show = shows.find(s => s.id === selectedShow);
    setSelectedShowData(show);
    setWorkflowOpen(true);
  };

  const showData = shows.find(s => s.id === selectedShow);

  return (
    <div>
      <PageHeader
        title="Send Email to Crew"
        description="Select a project and crew member, then send a templated email for approval"
      />

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Email Sender</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Project / Show *</Label>
            <Select value={selectedShow} onValueChange={handleShowChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a project..." />
              </SelectTrigger>
              <SelectContent>
                {shows.map(show => (
                  <SelectItem key={show.id} value={show.id}>
                    {show.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {shows.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">No projects available</p>
            )}
          </div>

          {selectedShow && (
            <div>
              <Label>Crew Member *</Label>
              <Select value={selectedPerson} onValueChange={handlePersonChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select crew member..." />
                </SelectTrigger>
                <SelectContent>
                  {crewForShow.map(crew => (
                    <SelectItem key={crew.id} value={crew.id}>
                      {crew.crew_member_name} - {crew.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {crewForShow.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">No crew assigned to this project</p>
              )}
            </div>
          )}

          {selectedPersonData && !recipientEmail && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This crew member does not have an email address on file.
              </AlertDescription>
            </Alert>
          )}

          {selectedPersonData && recipientEmail && (
            <div className="bg-muted p-3 rounded-md">
              <div className="text-xs text-muted-foreground mb-1">Will send to:</div>
              <div className="font-mono text-sm">{recipientEmail}</div>
            </div>
          )}

          <Button 
            onClick={handleOpenWorkflow}
            disabled={!selectedShow || !selectedPerson || !recipientEmail}
            className="w-full"
          >
            Continue to Email Selection
          </Button>
        </CardContent>
      </Card>

      <EmailApprovalWorkflow
        open={workflowOpen}
        onOpenChange={setWorkflowOpen}
        selectedShow={selectedShowData}
        selectedPerson={selectedPersonData}
        personEmail={recipientEmail}
      />
    </div>
  );
}