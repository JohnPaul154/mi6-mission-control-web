'use client';

import React, { useState, useEffect, FormEvent } from 'react';

// Firebase Import

import { 
  collection, 
  query, 
  where, 
  getDoc,
  getDocs, 
  addDoc, 
  updateDoc,
  deleteDoc, 
  doc, 
  serverTimestamp 
} from "firebase/firestore";

import { firestoreDB } from '@/firebase/init-firebase';
import { EventData, ArsenalData } from "@/firebase/collection-types";
import { Timestamp, DocumentReference } from "firebase/firestore";

// Component Imports
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
} from '@/components/ui/card';

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { useSession } from "@/contexts/SessionContext";

import { 
  Plus, 
  Trash2,
  Edit,
  X,
  Save,
  ChevronDown
} from 'lucide-react';

interface Item {
  name: string;
  serial: string;
  details: string;
}

const ItemCard: React.FC<{ item: Item }> = ({ item }) => {
  // State to toggle visibility of serial and details
  const [isOpen, setIsOpen] = useState(false);

  const toggleDetails = () => {
    setIsOpen((prev) => !prev); // Toggle the state
  };

  return (
    <div>
      <div className="flex justify-between items-center">
        <span>{item.name}</span>
        <button onClick={toggleDetails} aria-label="Toggle Details">
          <ChevronDown className={`w-5 h-5 ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Conditionally render the serial and details based on isOpen */}
      {isOpen && (
        <div className="mt-2 pl-6">
          <div className="text-sm text-gray-400">Serial: {item.serial}</div>
          <div className="text-sm text-gray-400">Details: {item.details}</div>
        </div>
      )}
    </div>
  );
};

export const EquipmentTable: React.FC<{ 
  equipment: ArsenalData[], 
  onDelete: (id: string, type: string) => void, 
  onEdit: (id: string, newName: string) => void 
  isAdmin: boolean,
}> = ({ equipment, onDelete, onEdit, isAdmin }) => {

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState<string>("");

  const handleEditClick = (item: ArsenalData) => {
    setEditingItemId(item.id || "");
    setEditedName(item.name);
  };

  const handleCancelClick = () => {
    setEditingItemId(null);
    setEditedName("");
  };

  const confirmCancel = () => {
  };

  const handleSaveClick = () => {
    if (editingItemId && editedName) {
      onEdit(editingItemId, editedName);
      setEditingItemId(null);
      setEditedName("");
    }
  };

  const confirmSave = () => {
  };

  return (
    <Table className="mt-4">
      <TableHeader>
        <TableRow>
          <TableHead className="w-11/12">Equipment</TableHead>
          {isAdmin && <TableHead className="w-[50px] text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {equipment.map((item) => (
          <TableRow key={item.id || ""}>
            <TableCell className="w-1/2 py-4">
              
              <ItemCard 
                item = {item}
              />
              
            </TableCell>
            {/* Edit|Delete arsenal (for admin only) */}
            {isAdmin && (
              <TableCell className="text-right">
                <div className="flex justify-end space-x-2">
                  {editingItemId === item.id || "" ? (
                    <>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            className="p-2"
                            onClick={confirmSave}
                          >
                            <Save className="w-5 h-5 text-white"/>
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirm Rename</AlertDialogTitle>
                          </AlertDialogHeader>
                          <p>Are you sure you want to rename to "{editedName}"?</p>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleSaveClick}>
                              Save
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            className="p-2"
                            onClick={confirmCancel}
                          >
                            <X className="w-5 h-5 text-white" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirm Cancel</AlertDialogTitle>
                          </AlertDialogHeader>
                          <p>Are you sure you want to discard changes?</p>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
                            <AlertDialogAction onClick={handleCancelClick}>
                              Discard
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  ) : (
                    <>
                      <button
                        className="p-2"
                        onClick={() => handleEditClick(item)}
                      >
                        <Edit className="w-5 h-5 text-white"/>
                      </button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="p-2">
                            <Trash2 className="w-5 h-5 text-red-500" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                          </AlertDialogHeader>
                          <p>Are you sure you want to delete "{item.name}"?</p>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(item.id || "", item.type)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

const ArsenalPage: React.FC = () => {

  // Global parameters
  const { session } = useSession();
  const isAdmin = session!.role === "admin";

  // Arsenal table states
  const [cameraEquipment, setCameraEquipment] = useState<ArsenalData[]>([]);
  const [laptopEquipment, setLaptopEquipment] = useState<ArsenalData[]>([]);
  const [printerEquipment, setPrinterEquipment] = useState<ArsenalData[]>([]);
  const [selectedTab, setSelectedTab] = useState<string>('camera'); 

  // Fetch all equipments and filter them by type
  const fetchEquipments = async (
    type: string,
    setState: React.Dispatch<React.SetStateAction<ArsenalData[]>>
  ) => {
    try {
      const q = query(collection(firestoreDB, "arsenal"), where("type", "==", type));
      const querySnapshot = await getDocs(q);
  
      // Process each document
      const equipment = await Promise.all(
        querySnapshot.docs.map(async (docSnapshot) => {
          const data = docSnapshot.data();
          return { id: docSnapshot.id, ...data } as ArsenalData;
        })
      );
  
      setState(equipment);
    } catch (error) {
      console.error(`Error fetching ${type} equipment:`, error);
    }
  };
  
  useEffect(() => {
    fetchEquipments("camera", setCameraEquipment);
    fetchEquipments("laptop", setLaptopEquipment);
    fetchEquipments("printer", setPrinterEquipment);
  }, []);

  const handleAddArsenal = async (name: string, type: string, serial: string, details: string) => {
    try {
      const docRef = await addDoc(collection(firestoreDB, "arsenal"), {
        name: name,
        type: type,
        details: details,
        serial: serial
      });
      console.log("Document written with ID: ", docRef.id);

      // Refresh the equipment list after adding
      fetchEquipments(type, type === "camera" 
        ? setCameraEquipment 
        : type === "laptop" 
        ? setLaptopEquipment 
        : setPrinterEquipment
      );
    } catch (e) {
      console.error("Error adding document: ", e);
    }
  };

  const handleEditArsenal = async (id: string, newName: string) => {
    try {
      const docRef = doc(firestoreDB, "arsenal", id);
      await updateDoc(docRef, { name: newName });
      console.log("Document updated with ID: ", id);

      var type = selectedTab

      fetchEquipments(
        type,
        type === "camera"
          ? setCameraEquipment
          : type === "laptop"
          ? setLaptopEquipment
          : setPrinterEquipment
      );
    } catch (e) {
      console.error("Error updating document: ", e);
    }
  };

  const handleDeleteArsenal = async (id: string, type: string) => {
    try {
      await deleteDoc(doc(firestoreDB, "arsenal", id));
      console.log("Document deleted with ID: ", id);

      fetchEquipments(type, 
        type === "camera" 
        ? setCameraEquipment 
        : type === "laptop" 
        ? setLaptopEquipment 
        : setPrinterEquipment
      );
    } catch (e) {
      console.error("Error deleting document: ", e);
    }
  };

  return (
    <div className="mim-full h-full flex p-4 flex-1 flex-col">
      <h1 className="text-3xl font-semibold mb-4 ml-4 max-h-[3%]">Arsenal</h1>

      <Card className="w-full h-full flex flex-col max-h-[96%]">
        <CardContent className="flex-1 flex flex-col flex-1 p-6">
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="grid w-full">
            <div className='flex'>
              
              {/* Type Selector */}
              <TabsList className="flex-1 grid grid-cols-3">
                <TabsTrigger value="camera">Camera</TabsTrigger>
                <TabsTrigger value="laptop">Laptop</TabsTrigger>
                <TabsTrigger value="printer">Printer</TabsTrigger>
              </TabsList>

              {/* Add equipment (for admin only) */}
              {isAdmin && (
                <AlertDialog>
                  <AlertDialogTrigger className="flex items-center bg-blue-200 text-zinc-900 border outline-white h-9 font-medium gap-2 px-4 py-2 rounded-md text-sm ml-4">
                      <Plus className='h-4 w-4'/>Add Arsenal
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Add Arsenal</AlertDialogTitle>
                    </AlertDialogHeader>
                    <form
                      onSubmit={(e: FormEvent<HTMLFormElement>) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const arsenalType = formData.get("arsenalType") as string;
                        const arsenalName = formData.get("arsenalName") as string;
                        const serial = formData.get("serial") as string;
                        const details = formData.get("details") as string;
                        handleAddArsenal(arsenalName, arsenalType, serial, details);
                      }}
                    >
                      <Label htmlFor="arsenalName" className="block mb-4">Name</Label>
                      <input
                        type="text"
                        name="arsenalName"
                        id="arsenalName"
                        className="w-full p-2 border rounded-md mb-4"
                        placeholder="Enter arsenal name"
                        required
                      />

                      <Label htmlFor="serial" className="block mb-4">Serial Number</Label>
                      <input
                        type="text"
                        name="serial"
                        id="serial"
                        className="w-full p-2 border rounded-md mb-4"
                        placeholder="Enter serial number"
                        required
                      />

                      <Label htmlFor="details" className="block mb-4">Details</Label>
                      <textarea
                        name="details"
                        id="details"
                        className="w-full p-2 border rounded-md mb-4"
                        placeholder="Enter details"
                        required
                      />
                      <Label className="block mb-4">Type</Label>
                      <RadioGroup name="arsenalType" defaultValue={selectedTab} className="mb-4">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="camera" id="camera" />
                          <Label htmlFor="camera">Camera</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="laptop" id="laptop" />
                          <Label htmlFor="laptop">Laptop</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="printer" id="printer" />
                          <Label htmlFor="printer">Printer</Label>
                        </div>
                      </RadioGroup>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction type="submit">Add</AlertDialogAction>
                      </AlertDialogFooter>
                    </form>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            {/* Tables */}
            <TabsContent value="camera">
              <EquipmentTable equipment={cameraEquipment} onDelete={handleDeleteArsenal} onEdit={handleEditArsenal} isAdmin={isAdmin}/>
            </TabsContent>
            <TabsContent value="laptop">
             <EquipmentTable equipment={laptopEquipment} onDelete={handleDeleteArsenal} onEdit={handleEditArsenal} isAdmin={isAdmin}/>
            </TabsContent>
            <TabsContent value="printer">
              <EquipmentTable equipment={printerEquipment} onDelete={handleDeleteArsenal} onEdit={handleEditArsenal} isAdmin={isAdmin}/>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ArsenalPage;
