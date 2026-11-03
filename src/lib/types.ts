export type GateStatus = 'passed' | 'current' | 'pending';
export type Decider = 'ai' | 'human' | 'ai+human' | 'platform';
export type Confidence = 'low' | 'medium' | 'high';

export interface Gate {
	id: string;
	name: string;
	description: string;
	decidedBy: Decider;
	status: GateStatus;
	evidence?: { label: string; url: string };
}

export interface Estimate {
	tokensLow: number;
	tokensHigh: number;
	humanHoursLow: number;
	humanHoursHigh: number;
	confidence: Confidence;
	approach: string;
}

export interface Project {
	slug: string;
	title: string;
	ngo: string;
	region: string;
	summary: string;
	problem: string;
	estimate: Estimate;
	/** Money raised so far in USD. Simulated in the hackathon build. */
	raisedUsd: number;
	/** Months of support the NGO and volunteers commit to after delivery. */
	supportMonths: number;
	gates: Gate[];
}

export interface Submission {
	ngo: string;
	region: string;
	title: string;
	problem: string;
	beneficiaries: string;
	data: string;
}
