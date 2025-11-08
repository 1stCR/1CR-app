export interface PartPrice {
  part_number: string;
  price: number;
  in_stock: boolean;
  lead_time_days: number;
  supplier: string;
}

export async function lookupPartPrice(partNumber: string): Promise<PartPrice | null> {
  try {
    // Note: This is a placeholder for SupplyHouse API integration
    // Replace with actual API endpoint when available
    const response = await fetch('https://api.supplyhouse.com/v1/parts/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPPLYHOUSE_API_KEY || ''}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        part_number: partNumber
      })
    });

    if (!response.ok) {
      console.error('SupplyHouse API error:', response.status);
      return null;
    }

    const data = await response.json();

    return {
      part_number: data.part_number,
      price: data.price,
      in_stock: data.stock_status === 'in_stock',
      lead_time_days: data.estimated_ship_days || 3,
      supplier: 'SupplyHouse'
    };
  } catch (error) {
    console.error('Error fetching part price:', error);
    return null;
  }
}

interface OrderItem {
  part_number: string;
  quantity: number;
}

export async function createOrder(parts: OrderItem[]) {
  try {
    // Note: This is a placeholder for SupplyHouse API integration
    const response = await fetch('https://api.supplyhouse.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPPLYHOUSE_API_KEY || ''}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: parts,
        shipping_address: {
          // Your business address would go here
          name: 'Appliance Man Dan',
          street: '123 Main St',
          city: 'Sheridan',
          state: 'WY',
          zip: '82801'
        }
      })
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
}

// Mock function for local development
export async function mockLookupPartPrice(partNumber: string): Promise<PartPrice> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  return {
    part_number: partNumber,
    price: Math.random() * 200 + 50,
    in_stock: Math.random() > 0.3,
    lead_time_days: Math.floor(Math.random() * 7) + 1,
    supplier: 'SupplyHouse (Mock)'
  };
}
