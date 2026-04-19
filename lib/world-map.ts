import world from "@svg-maps/world";

export type WorldLocation = {
  id: string;
  name: string;
  path: string;
};

export const worldViewBox = world.viewBox;
export const worldLocations = world.locations as WorldLocation[];
