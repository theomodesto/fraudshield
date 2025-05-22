import React, { useEffect } from 'react';
import { useQuery } from 'react-query';
import { api } from '@/utils/api';

// Types for dashboard metrics
interface DashboardMetrics {
  totalTransactions: number;
  approvedCount: number;
  rejectedCount: number;
  reviewCount: number;
  fraudRate: number;
  recentDecisions: {
    id: string;
    decision: string;
    riskScore: number;
    timestamp: number;
  }[];
}

// Mock data (replace with actual API call)
const fetchDashboardMetrics = async (): Promise<DashboardMetrics> => {
  // In production, this would be an API call
  // return api.get('/metrics/dashboard').then(res => res.data);
  
  // Mock data for now
  return {
    totalTransactions: 1256,
    approvedCount: 1102,
    rejectedCount: 89,
    reviewCount: 65,
    fraudRate: 7.1,
    recentDecisions: [
      { id: '1', decision: 'approve', riskScore: 0.12, timestamp: Date.now() - 1000 * 60 * 5 },
      { id: '2', decision: 'reject', riskScore: 0.95, timestamp: Date.now() - 1000 * 60 * 10 },
      { id: '3', decision: 'review', riskScore: 0.68, timestamp: Date.now() - 1000 * 60 * 15 },
      { id: '4', decision: 'approve', riskScore: 0.23, timestamp: Date.now() - 1000 * 60 * 20 },
      { id: '5', decision: 'approve', riskScore: 0.41, timestamp: Date.now() - 1000 * 60 * 25 },
    ]
  };
};

export default function Dashboard() {
  const { data, isLoading, error } = useQuery<DashboardMetrics>(
    'dashboardMetrics',
    fetchDashboardMetrics
  );

  useEffect(() => {
    document.title = 'Dashboard - FraudShield';
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <h3 className="text-red-800 font-medium">Error loading dashboard data</h3>
        <p className="text-red-700">{error ? (error as Error).message : 'Unknown error'}</p>
      </div>
    );
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'approve': return 'text-green-600 bg-green-100';
      case 'reject': return 'text-red-600 bg-red-100';
      case 'review': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score < 0.3) return 'text-green-700';
    if (score < 0.7) return 'text-yellow-700';
    return 'text-red-700';
  };

  return (
    <>
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">Dashboard</h1>
      
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Transactions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-primary-100 dark:bg-primary-900">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Transactions</p>
              <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">{data.totalTransactions.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        {/* Approved */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Approved</p>
              <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">{data.approvedCount.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        {/* Rejected */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100 dark:bg-red-900">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Rejected</p>
              <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">{data.rejectedCount.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        {/* Fraud Rate */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Fraud Rate</p>
              <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">{data.fraudRate}%</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Recent Activity */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Recent Transactions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  ID
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Time
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Decision
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Risk Score
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {data.recentDecisions.map((transaction) => (
                <tr key={transaction.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {transaction.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {formatDate(transaction.timestamp)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getDecisionColor(transaction.decision)}`}>
                      {transaction.decision.charAt(0).toUpperCase() + transaction.decision.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <span className={`${getRiskScoreColor(transaction.riskScore)}`}>
                      {transaction.riskScore.toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
} 