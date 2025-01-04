'use client';

import React, { useState, useEffect, FormEvent } from 'react';

// Firebase Import

import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc,
  deleteDoc, 
  doc, 
  serverTimestamp 
} from "firebase/firestore";

import { firestoreDB } from '@/firebase/initFirebase';

// Component Imports
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

import { 
  Plus, 
  Trash2,
  Edit,
  X,
  Save
} from 'lucide-react';

interface ArsenalItem {
  id: string;
  name: string;
  type: string;
  events: string[];
  dateAdded?: Date;
}

export const EquipmentTable: React.FC<{ 
  equipment: ArsenalItem[], 
  onDelete: (id: string, type: string) => void, 
  onEdit: (id: string, newName: string) => void 
}> = ({ equipment, onDelete, onEdit }) => {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState<string>("");

  const handleEditClick = (item: ArsenalItem) => {
    setEditingItemId(item.id);
    setEditedName(item.name);
  };

  const handleCancelClick = () => {
    setEditingItemId(null);
    setEditedName("");
  };

  const handleSaveClick = () => {
    if (editingItemId && editedName) {
      onEdit(editingItemId, editedName);
      setEditingItemId(null);
      setEditedName("");
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-1/12">ID</TableHead>
          <TableHead className="w-1/2">Equipment</TableHead>
          <TableHead>Event</TableHead>
          <TableHead className="w-[50px] text-right"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {equipment.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="w-1/12">{item.id}</TableCell>
            <TableCell className="w-1/2">
              {editingItemId === item.id ? (
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="w-full p-2 border rounded-md"
                />
              ) : (
                item.name
              )}
            </TableCell>
            <TableCell>{item.events.length > 0 ? item.events.join(", ") : "-"}</TableCell>
            <TableCell>
              <div className="flex space-x-2">
                {editingItemId === item.id ? (
                  <>
                    <button
                      className="p-2"
                      onClick={handleSaveClick}
                    >
                      <Save className="w-5 h-5 text-white"/>
                    </button>
                    <button
                      className="p-2"
                      onClick={handleCancelClick}
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
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
                          <AlertDialogAction onClick={() => onDelete(item.id, item.type)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};


const ArsenalPage: React.FC = () => {
  const [cameraEquipment, setCameraEquipment] = useState<ArsenalItem[]>([]);
  const [laptopEquipment, setLaptopEquipment] = useState<ArsenalItem[]>([]);
  const [printerEquipment, setPrinterEquipment] = useState<ArsenalItem[]>([]);
  const [selectedTab, setSelectedTab] = useState<string>('camera');  // Track selected tab

  const fetchEquipments = async (type: string, setState: React.Dispatch<React.SetStateAction<ArsenalItem[]>>) => {
    try {
      const q = query(collection(firestoreDB, "arsenal"), where("type", "==", type));
      const querySnapshot = await getDocs(q);
      const equipment = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ArsenalItem[];
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

  const handleAddArsenal = async (name: string, type: string) => {
    try {
      const docRef = await addDoc(collection(firestoreDB, "arsenal"), {
        name: name,
        type: type,
        events: [],
        dateAdded: serverTimestamp(),
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

      // Refresh the equipment list after updating
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

      // Refresh the equipment list after deleting
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
    <div className="min-full h-full w-full flex p-4 flex-1 flex-col">
      <h1 className="text-3xl font-semibold mb-4 ml-4">Arsenal</h1>

      <Card className="w-full h-full flex flex-col">
        <CardContent className="flex flex-col flex-1 p-6">
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="grid w-full">
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="camera">Camera</TabsTrigger>
              <TabsTrigger value="laptop">Laptop</TabsTrigger>
              <TabsTrigger value="printer">Printer</TabsTrigger>
            </TabsList>

            <TabsContent value="camera">
              <EquipmentTable equipment={cameraEquipment} onDelete={handleDeleteArsenal} onEdit={handleEditArsenal} />
            </TabsContent>
            <TabsContent value="laptop">
             <EquipmentTable equipment={laptopEquipment} onDelete={handleDeleteArsenal} onEdit={handleEditArsenal} />
            </TabsContent>
            <TabsContent value="printer">
              <EquipmentTable equipment={printerEquipment} onDelete={handleDeleteArsenal} onEdit={handleEditArsenal} />
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="flex justify-end pt-4">
          <AlertDialog>
            <AlertDialogTrigger className="flex items-center p-2 bg-blue-500 text-white rounded-md">
              <Plus className="w-5 h-5 mr-2" />
              Add Arsenal
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
                  handleAddArsenal(arsenalName, arsenalType);
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
        </CardFooter>
      </Card>
    </div>
  );
};

export default ArsenalPage;
