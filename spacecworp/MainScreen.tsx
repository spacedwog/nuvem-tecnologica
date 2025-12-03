import React from 'react';
import VespaApp from './VespaApp';

type Props = {
  route: { params: { cnpj: string } };
};

export default function MainScreen({ route }: Props) {
  return <VespaApp cnpj={route.params.cnpj} />;
}