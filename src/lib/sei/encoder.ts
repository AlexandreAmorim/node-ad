/**
 * Encoder SOAP 1.1 rpc/encoded para o SeiWS.
 *
 * O SoapServer do PHP decide se um nó é lista ou escalar pelo
 * soapenc:arrayType="xsd:string[N]". Sem o tamanho, array de 1 item
 * chega como struct e a chamada falha.
 */

export type SeiValue = string | null | SeiStruct | SeiArray;

export interface SeiStruct {
  readonly kind: 'struct';
  type: string;
  fields: Array<[string, SeiValue]>;
}

export interface SeiArray {
  readonly kind: 'array';
  wrapper: string;
  itemType: string;
  items: SeiValue[];
}

export function struct(type: string, fields: Array<[string, SeiValue]>): SeiStruct {
  return { kind: 'struct', type, fields };
}

export function arr(wrapper: string, itemType: string, items: SeiValue[]): SeiArray {
  return { kind: 'array', wrapper, itemType, items };
}

type Param = [name: string, value: SeiValue];

function escapeXml(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function encodeValue(name: string, value: SeiValue): string {
  if (value === null) {
    return `<${name} xsi:nil="true"/>`;
  }

  if (typeof value === 'string') {
    return `<${name} xsi:type="xsd:string">${escapeXml(value)}</${name}>`;
  }

  if (value.kind === 'array') {
    const inner = value.items.map((i) => encodeValue('item', i)).join('');
    return (
      `<${name} xsi:type="sei:${value.wrapper}"` +
      ` soapenc:arrayType="${value.itemType}[${value.items.length}]">` +
      `${inner}</${name}>`
    );
  }

  const inner = value.fields.map(([k, v]) => encodeValue(k, v)).join('');
  return `<${name} xsi:type="sei:${value.type}">${inner}</${name}>`;
}

export function buildEnvelope(operation: string, params: Param[]): string {
  const body = params.map(([name, value]) => encodeValue(name, value)).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:sei="Sei"
  soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <soapenv:Body>
    <sei:${operation}>${body}</sei:${operation}>
  </soapenv:Body>
</soapenv:Envelope>`;
}

export type { Param as SeiParam };
