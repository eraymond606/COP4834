import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Orders = () => {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    axios
      .get('http://localhost:5000/orders')
      .then((response) => setOrders(response.data))
      .catch((error) => console.error('Error fetching orders:', error));
  }, []);

  return (
    <div>
      <h2>Orders</h2>
      <ul>
        {orders.length ? (
          orders.map((order) => (
            <li key={order.id}>
              Order #{order.id} -{' '}
              {order.item ? order.item.name : 'No item specified'}
            </li>
          ))
        ) : (
          <p>No orders yet.</p>
        )}
      </ul>
    </div>
  );
};

export default Orders;
