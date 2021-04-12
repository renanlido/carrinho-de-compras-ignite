import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if(storagedCart) {
     return JSON.parse(storagedCart);
    };

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      //new var for cart
      const productsInCart = [...cart];

      const productExists = productsInCart.find(product => product.id === productId);

      const productExistsAmount = productExists ? productExists.amount : 1;

      //stock
      const { amount: stockAmount } = await api.get<Stock>(`stock/${productId}`)
      .then(response => response.data);

      //Verifing if has product in stock
      if(stockAmount <= productExistsAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      //Checking if the product exists, change its quantity, add it to the cart 
      //state and save it to localStorag
      if(productExists) {

        productExists.amount = productExists.amount + 1;

      } else {
        const product = await api.get<Product>(`/products/${productId}`).then(response => response.data);
        
        const productWithUpdatedAmount = {...product, amount: 1};

        productsInCart.push(productWithUpdatedAmount); 
      }      

      setCart(productsInCart);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(productsInCart));

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productsInCart = [...cart];
      
      const productExists = productsInCart.find( product => product.id === productId );
    
      if(productExists) {
        const productByIndex = productsInCart.findIndex(product => product.id === productId);
        
        productsInCart.splice(productByIndex, 1);

        setCart(productsInCart);

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(productsInCart));

        toast.success(`Item ${productExists.title} removido com sucesso!`);

        return;
      }
      
      throw Error;
      
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({ productId, amount}: UpdateProductAmount) => {
    try {
      if(amount <= 0) return;

      //stock
      const { amount: stockAmount } = await api.get<Stock>(`stock/${productId}`)
      .then(response => response.data);

      //Verifing if has product in stock
      if(amount  > stockAmount ) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const productsInCart = [...cart];

      const productExists = productsInCart.find( product => product.id === productId );

      if(productExists) {
        productExists.amount = amount;

        setCart(productsInCart);

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(productsInCart));
      }


    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
