'use client';

import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

type SalesData = {
    ticketType: string;
    totalQuantity: number;
    sold: number;
    remaining: number;
    price: number;
    revenue: number;
};

export default function ConcertSalesChart({ data }: { data: SalesData[] }) {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<Chart | null>(null);

    // Define the order for ticket types
    const ticketTypeOrder = [
        'Premium',
        'VIP',
        'Gold',
        'Silver',
        'Standard A',
        'Standard B',
        'Standard C'
    ];

    // Sort data according to the defined order
    const sortedData = [...data].sort((a, b) => {
        const aIndex = ticketTypeOrder.indexOf(a.ticketType);
        const bIndex = ticketTypeOrder.indexOf(b.ticketType);

        // If both are in the order list, sort by their position
        if (aIndex !== -1 && bIndex !== -1) {
            return aIndex - bIndex;
        }

        // If only one is in the order list, prioritize it
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;

        // If neither is in the order list, sort alphabetically
        return a.ticketType.localeCompare(b.ticketType);
    });

    useEffect(() => {
        if (!chartRef.current || !sortedData.length) return;

        // Destroy existing chart
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const ctx = chartRef.current.getContext('2d');
        if (!ctx) return;

        // Prepare data for chart using sorted data
        const labels = sortedData.map(item => item.ticketType);
        const soldData = sortedData.map(item => item.sold);
        const remainingData = sortedData.map(item => item.remaining);

        chartInstance.current = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Sold',
                        data: soldData,
                        backgroundColor: 'rgba(34, 197, 94, 0.8)',
                        borderColor: 'rgba(34, 197, 94, 1)',
                        borderWidth: 1,
                        borderRadius: 4,
                    },
                    {
                        label: 'Remaining',
                        data: remainingData,
                        backgroundColor: 'rgba(156, 163, 175, 0.8)',
                        borderColor: 'rgba(156, 163, 175, 1)',
                        borderWidth: 1,
                        borderRadius: 4,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            font: {
                                size: 14,
                                weight: 'bold'
                            },
                            padding: 20
                        }
                    },
                    title: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            font: {
                                size: 12
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });

        // Cleanup function
        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [sortedData]);

    if (!data.length) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-500">
                <p className="text-lg">No ticket data available</p>
            </div>
        );
    }

    return (
        <div className="h-96">
            <canvas ref={chartRef} />
        </div>
    );
} 